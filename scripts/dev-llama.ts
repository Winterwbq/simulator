import "dotenv/config";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

type RunOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

const currentFile = fileURLToPath(import.meta.url);
const simulatorRoot = path.resolve(path.dirname(currentFile), "..");

const llamaCppDir = resolvePath(process.env.LLAMA_CPP_DIR ?? "./llama.cpp");
const llamaBuildDir = resolvePath(process.env.LLAMA_BUILD_DIR ?? "./llama.cpp/build");
const llamaModelDir = resolvePath(process.env.LLAMA_MODEL_DIR ?? "./models");
const llamaModelPath = resolvePath(process.env.LLAMA_MODEL_PATH ?? "./models/Qwen3.5-4B-Q4_0.gguf");
const llamaModelUrl =
  process.env.LLAMA_MODEL_URL ??
  "https://huggingface.co/unsloth/Qwen3.5-4B-GGUF/resolve/main/Qwen3.5-4B-Q4_0.gguf";
const llamaHost = process.env.LLAMA_SERVER_HOST ?? "127.0.0.1";
const llamaPort = Number(process.env.LLAMA_SERVER_PORT ?? 8081);
const llamaModelAlias = process.env.LLAMA_MODEL_ALIAS ?? "local-grader";
const llamaContextSize = process.env.LLAMA_CONTEXT_SIZE ?? "8192";
const llamaGpuLayers = process.env.LLAMA_N_GPU_LAYERS ?? "999";
const llamaBaseUrl = `http://${llamaHost}:${llamaPort}`;

const venvDir = path.join(simulatorRoot, ".llama-tools");
const venvPython = path.join(venvDir, "bin", "python");
const venvPip = path.join(venvDir, "bin", "pip");
const venvCmake = path.join(venvDir, "bin", "cmake");
const shutdownTimeoutMs = 5_000;

function resolvePath(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(simulatorRoot, value);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("zsh", ["-lc", `command -v ${command}`], {
      cwd: simulatorRoot,
      stdio: "ignore",
    });

    child.on("exit", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

async function runCommand(command: string, args: string[], options: RunOptions = {}): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? simulatorRoot,
      env: options.env ?? process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function ensureLlamaCppClone(): Promise<void> {
  if (await pathExists(llamaCppDir)) {
    return;
  }

  console.log("Cloning llama.cpp into simulator/llama.cpp ...");
  await runCommand("git", [
    "clone",
    "--depth",
    "1",
    "https://github.com/ggml-org/llama.cpp.git",
    llamaCppDir,
  ]);
}

async function ensureCmakeBinary(): Promise<string> {
  if (await commandExists("cmake")) {
    return "cmake";
  }

  if (!(await pathExists(venvPython))) {
    console.log("Creating local Python environment for build tools ...");
    await runCommand("python3", ["-m", "venv", venvDir]);
  }

  if (!(await pathExists(venvCmake))) {
    console.log("Installing cmake into the local build-tools environment ...");
    await runCommand(venvPip, ["install", "--upgrade", "pip", "cmake"]);
  }

  return venvCmake;
}

async function ensureModelDownload(): Promise<void> {
  await mkdir(llamaModelDir, { recursive: true });

  if (await pathExists(llamaModelPath)) {
    return;
  }

  console.log("Downloading the local GGUF grading model. This can take a while on the first run ...");
  await runCommand("curl", [
    "-L",
    "--fail",
    "-C",
    "-",
    "-o",
    llamaModelPath,
    llamaModelUrl,
  ]);
}

async function ensureLlamaServerBuild(cmakeBinary: string): Promise<string> {
  await mkdir(llamaBuildDir, { recursive: true });

  const binaryCandidates = [
    path.join(llamaBuildDir, "bin", "llama-server"),
    path.join(llamaBuildDir, "llama-server"),
  ];

  if (!(await pathExists(binaryCandidates[0])) && !(await pathExists(binaryCandidates[1]))) {
    console.log("Configuring llama.cpp for the local Apple Silicon Metal build ...");
    await runCommand(cmakeBinary, [
      "-S",
      llamaCppDir,
      "-B",
      llamaBuildDir,
      "-G",
      "Unix Makefiles",
      "-DCMAKE_BUILD_TYPE=Release",
      "-DGGML_METAL=ON",
    ]);

    console.log("Building llama-server ...");
    if (await commandExists("make")) {
      await runCommand("make", [
        "-C",
        llamaBuildDir,
        "-j",
        String(Math.max(1, Math.min(os.cpus().length, 8))),
        "llama-server",
      ]);
    } else {
      await runCommand(cmakeBinary, [
        "--build",
        llamaBuildDir,
        "--config",
        "Release",
        "--target",
        "llama-server",
        "-j",
        String(Math.max(1, Math.min(os.cpus().length, 8))),
      ]);
    }
  }

  if (await pathExists(binaryCandidates[0])) {
    return binaryCandidates[0];
  }

  if (await pathExists(binaryCandidates[1])) {
    return binaryCandidates[1];
  }

  throw new Error("llama-server build finished, but the executable was not found.");
}

async function isHealthReady(): Promise<boolean> {
  try {
    const response = await fetch(`${llamaBaseUrl}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForHealth(timeoutMs: number): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isHealthReady()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Timed out waiting for llama-server to become healthy.");
}

function holdProcessOpen(): void {
  setInterval(() => {
    void 0;
  }, 60_000);
}

function waitForChildExit(child: ChildProcess): Promise<number | null> {
  return new Promise((resolve) => {
    child.once("exit", (code) => resolve(code));
  });
}

function signalOwnedServer(child: ChildProcess, signal: NodeJS.Signals): void {
  try {
    if (!child.pid) {
      child.kill(signal);
      return;
    }

    process.kill(-child.pid, signal);
  } catch {
    void 0;
  }
}

async function stopOwnedServer(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.killed) {
    return;
  }

  signalOwnedServer(child, "SIGTERM");

  const exitedGracefully = await Promise.race([
    waitForChildExit(child).then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), shutdownTimeoutMs)),
  ]);

  if (exitedGracefully || child.exitCode !== null) {
    return;
  }

  signalOwnedServer(child, "SIGKILL");

  await waitForChildExit(child);
}

async function main() {
  console.log(`Preparing local llama.cpp runtime at ${llamaBaseUrl}`);

  if (await isHealthReady()) {
    console.log("An existing local llama-server is already running on the configured port.");
    holdProcessOpen();
    return;
  }

  await ensureLlamaCppClone();
  const cmakeBinary = await ensureCmakeBinary();
  await ensureModelDownload();
  const llamaServerBinary = await ensureLlamaServerBuild(cmakeBinary);

  console.log("Starting llama-server ...");
  const child = spawn(
    llamaServerBinary,
    [
      "--host",
      llamaHost,
      "--port",
      String(llamaPort),
      "--alias",
      llamaModelAlias,
      "-m",
      llamaModelPath,
      "-c",
      llamaContextSize,
      "-ngl",
      llamaGpuLayers,
    ],
    {
      cwd: simulatorRoot,
      env: process.env,
      detached: true,
      stdio: "inherit",
    },
  );

  let shuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`Stopping llama-server after ${signal} ...`);
    await stopOwnedServer(child);
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("SIGHUP", () => {
    void shutdown("SIGTERM");
  });

  child.on("error", (error) => {
    console.error("Failed to start llama-server:", error);
    process.exit(1);
  });

  child.on("exit", (code) => {
    if (!shuttingDown) {
      process.exit(code ?? 1);
    }
  });

  await waitForHealth(10 * 60 * 1000);
  console.log("llama-server is healthy and ready for local reply grading.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
