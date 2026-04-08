import "dotenv/config";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const simulatorRoot = path.resolve(path.dirname(currentFile), "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const allowAiMode = process.env.VITE_ALLOW_AI_MODE === "true";
const targetScript = allowAiMode ? "dev:with-ai" : "dev:client";

console.log(
  allowAiMode
    ? "AI mode is enabled. Starting client, local grading API, and llama-server."
    : "AI mode is disabled. Starting client only (no local grading API or llama-server).",
);

const child = spawn(npmCommand, ["run", targetScript], {
  cwd: simulatorRoot,
  env: process.env,
  stdio: "inherit",
});

let shuttingDown = false;

const forwardSignal = (signal: NodeJS.Signals) => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  child.kill(signal);
};

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));
process.on("SIGHUP", () => forwardSignal("SIGHUP"));

child.on("error", (error) => {
  console.error("Failed to start development stack:", error);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
