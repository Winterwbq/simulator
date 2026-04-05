import "dotenv/config";
import express from "express";
import { access } from "node:fs/promises";
import path from "node:path";

type StakeholderDeltas = {
  regulator: number;
  investor: number;
  community: number;
  engineering: number;
  media: number;
};

type ImpactLevel =
  | "strong_negative"
  | "negative"
  | "neutral"
  | "positive"
  | "strong_positive";

type StakeholderImpacts = {
  regulator: ImpactLevel;
  investor: ImpactLevel;
  community: ImpactLevel;
  engineering: ImpactLevel;
  media: ImpactLevel;
};

type DraftGradeResult = {
  trust_deltas: StakeholderDeltas;
};

type GradeReplyRequest = {
  replyText?: string;
  replyType?: string;
  source?: "preset" | "draft";
  responseLabel?: string;
  message?: {
    id?: string;
    subject?: string;
    from?: string;
    stakeholder?: string;
    body?: string;
  };
};

type LlamaChatCompletionResponse = {
  error?: {
    message?: string;
  };
  choices?: Array<{
    message?: {
      content?: unknown;
      reasoning_content?: unknown;
    };
  }>;
};

type LlamaMessage = {
  content?: unknown;
  reasoning_content?: unknown;
};

const app = express();
const port = Number(process.env.SIMULATOR_SERVER_PORT ?? 8787);
const llamaHost = process.env.LLAMA_SERVER_HOST ?? "127.0.0.1";
const llamaPort = Number(process.env.LLAMA_SERVER_PORT ?? 8081);
const llamaModel = process.env.LLAMA_MODEL_ALIAS ?? "local-grader";
const llamaBaseUrl = `http://${llamaHost}:${llamaPort}`;
const llamaModelPath = resolveConfiguredPath(
  process.env.LLAMA_MODEL_PATH ?? "./models/Qwen3.5-4B-Q4_0.gguf",
);
const llamaBuildDir = resolveConfiguredPath(process.env.LLAMA_BUILD_DIR ?? "./llama.cpp/build");

const gradingSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    trust_impacts: {
      type: "object",
      additionalProperties: false,
      properties: {
        regulator: {
          type: "string",
          enum: ["strong_negative", "negative", "neutral", "positive", "strong_positive"],
        },
        investor: {
          type: "string",
          enum: ["strong_negative", "negative", "neutral", "positive", "strong_positive"],
        },
        community: {
          type: "string",
          enum: ["strong_negative", "negative", "neutral", "positive", "strong_positive"],
        },
        engineering: {
          type: "string",
          enum: ["strong_negative", "negative", "neutral", "positive", "strong_positive"],
        },
        media: {
          type: "string",
          enum: ["strong_negative", "negative", "neutral", "positive", "strong_positive"],
        },
      },
      required: ["regulator", "investor", "community", "engineering", "media"],
    },
  },
  required: ["trust_impacts"],
} as const;

app.use(express.json({ limit: "1mb" }));

function resolveConfiguredPath(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isLlamaReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${llamaBaseUrl}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function getServerBinaryExists(): Promise<boolean> {
  const candidates = [
    path.join(llamaBuildDir, "bin", "llama-server"),
    path.join(llamaBuildDir, "llama-server"),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return true;
    }
  }

  return false;
}

async function getDraftGradingHealth() {
  const [llamaReachable, modelExists, serverBinaryExists] = await Promise.all([
    isLlamaReachable(),
    pathExists(llamaModelPath),
    getServerBinaryExists(),
  ]);

  let status: "ready" | "warming_up" | "model_missing" | "binary_missing" | "server_unreachable";
  let statusMessage = "Local llama.cpp reply grader is warming up.";

  if (llamaReachable) {
    status = "ready";
    statusMessage = "Local llama.cpp reply grader is ready on this machine.";
  } else if (!modelExists) {
    status = "model_missing";
    statusMessage =
      "The local GGUF model is missing. Run `npm run dev` and wait for the model download to finish.";
  } else if (!serverBinaryExists) {
    status = "binary_missing";
    statusMessage = "The local llama-server binary is missing. Run `npm run dev` to build the local grader.";
  } else {
    status = "warming_up";
    statusMessage = "Local llama.cpp is loading the model. Reply grading will unlock once warm-up finishes.";
  }

  return {
    gradingBackend: "llama.cpp",
    llamaServerUrl: llamaBaseUrl,
    llamaModel,
    llamaReachable,
    modelExists,
    serverBinaryExists,
    status,
    statusMessage,
  };
}

function buildGradingPrompt(requestBody: Required<GradeReplyRequest>) {
  return [
    "You are grading a player-written reply inside a governance and crisis-communications simulator.",
    "Return exactly one JSON object matching the schema.",
    "Do not include chain-of-thought, analysis text, think tags, markdown fences, or prose before or after the JSON.",
    "Use exactly one top-level key: `trust_impacts`.",
    "Inside `trust_impacts`, return one label for regulator, investor, community, engineering, and media.",
    "Allowed labels are: `strong_negative`, `negative`, `neutral`, `positive`, `strong_positive`.",
    "The server will map these labels to final trust deltas of -10, -5, 0, +5, and +10.",
    "Score only from the provided reply text and current email context.",
    "Be conservative. Weak, vague, evasive, or overly polished replies should not receive generous positive scores.",
    "If `source` is `preset`, the reply text is a concise canonical summary of the preset action. Grade that summary directly without inventing missing details.",
    "",
    "Stakeholder guidance:",
    "- regulator: rewards transparency, credible governance, and responsible disclosure; penalizes evasiveness or overconfidence.",
    "- investor: rewards disciplined execution and credible communication; penalizes signals of disorder or unmanaged delay.",
    "- community: rewards visible engagement, respect, and responsiveness to local concerns.",
    "- engineering: rewards technical honesty, evidence-seeking, and respect for real uncertainty.",
    "- media: rewards timely, consistent, accountable communication and penalizes stonewalling or spin.",
    "",
    "Example shape:",
    JSON.stringify(
      {
        trust_impacts: {
          regulator: "positive",
          investor: "neutral",
          community: "strong_positive",
          engineering: "positive",
          media: "negative",
        },
      },
      null,
      2,
    ),
    "",
    "Scenario:",
    JSON.stringify(
      {
        source: requestBody.source,
        response_label: requestBody.responseLabel,
        reply_type: requestBody.replyType,
        reply_text: requestBody.replyText,
        current_email: requestBody.message,
      },
      null,
      2,
    ),
  ].join("\n");
}

function normalizeLlamaContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object") {
          const objectItem = item as Record<string, unknown>;
          const textValue = objectItem.text;
          if (typeof textValue === "string") {
            return textValue;
          }
        }

        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

function getLlamaMessageText(message: LlamaMessage | undefined): string {
  return normalizeLlamaContent(message?.content) || normalizeLlamaContent(message?.reasoning_content);
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("The local model returned an empty grading payload.");
  }

  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    void 0;
  }

  const firstBrace = trimmed.indexOf("{");
  if (firstBrace === -1) {
    throw new Error("The local model returned no JSON object.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = firstBrace; index < trimmed.length; index += 1) {
    const char = trimmed[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        const candidate = trimmed.slice(firstBrace, index + 1);
        JSON.parse(candidate);
        return candidate;
      }
    }
  }

  throw new Error("The local model returned an invalid JSON grading payload.");
}

function normalizeImpactLevel(value: unknown): ImpactLevel {
  if (
    value === "strong_negative" ||
    value === "negative" ||
    value === "neutral" ||
    value === "positive" ||
    value === "strong_positive"
  ) {
    return value;
  }

  return "neutral";
}

function mapImpactLevelToDelta(level: ImpactLevel): number {
  if (level === "strong_negative") {
    return -10;
  }
  if (level === "negative") {
    return -5;
  }
  if (level === "positive") {
    return 5;
  }
  if (level === "strong_positive") {
    return 10;
  }
  return 0;
}

function normalizeTrustImpacts(raw: Record<string, unknown>): StakeholderImpacts {
  const source =
    raw.trust_impacts && typeof raw.trust_impacts === "object"
      ? (raw.trust_impacts as Record<string, unknown>)
      : raw;

  return {
    regulator: normalizeImpactLevel(source.regulator),
    investor: normalizeImpactLevel(source.investor),
    community: normalizeImpactLevel(source.community),
    engineering: normalizeImpactLevel(source.engineering),
    media: normalizeImpactLevel(source.media),
  };
}

function normalizeTrustDeltas(raw: Record<string, unknown>): StakeholderDeltas {
  const impacts = normalizeTrustImpacts(raw);

  return {
    regulator: mapImpactLevelToDelta(impacts.regulator),
    investor: mapImpactLevelToDelta(impacts.investor),
    community: mapImpactLevelToDelta(impacts.community),
    engineering: mapImpactLevelToDelta(impacts.engineering),
    media: mapImpactLevelToDelta(impacts.media),
  };
}

function normalizeGradePayload(rawPayload: string): DraftGradeResult {
  const parsed = JSON.parse(extractJsonObject(rawPayload)) as Record<string, unknown>;
  return {
    trust_deltas: normalizeTrustDeltas(parsed),
  };
}

app.get("/api/health", async (_request, response) => {
  response.json(await getDraftGradingHealth());
});

async function handleGradeReply(request: express.Request, response: express.Response) {
  const { replyText, replyType, source, responseLabel, message } = request.body as GradeReplyRequest;

  if (!replyText || !replyType || !message?.subject || !message?.body) {
    response.status(400).json({
      error: "Missing required grading fields.",
    });
    return;
  }

  const health = await getDraftGradingHealth();

  if (!health.llamaReachable) {
    response.status(503).json({
      error: health.statusMessage,
    });
    return;
  }

  try {
    const gradingPrompt = buildGradingPrompt({
      replyText,
      replyType,
      source: source ?? "draft",
      responseLabel: responseLabel ?? "",
      message,
    });

    const llamaResponse = await fetch(`${llamaBaseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: llamaModel,
        temperature: 0,
        max_tokens: 220,
        stream: false,
        reasoning_format: "none",
        chat_template_kwargs: {
          enable_thinking: false,
        },
        messages: [
          {
            role: "system",
            content:
              "You are a strict JSON-only grading assistant. Return exactly one JSON object and nothing else.",
          },
          {
            role: "user",
            content: gradingPrompt,
          },
        ],
        response_format: {
          type: "json_schema",
          schema: gradingSchema,
        },
      }),
    });

    if (!llamaResponse.ok) {
      const errorText = await llamaResponse.text();
      response.status(502).json({
        error: `Local llama-server returned ${llamaResponse.status}: ${errorText || "Unknown error"}`,
      });
      return;
    }

    const payload = (await llamaResponse.json()) as LlamaChatCompletionResponse;

    if (payload.error?.message) {
      response.status(502).json({
        error: payload.error.message,
      });
      return;
    }

    const content = getLlamaMessageText(payload.choices?.[0]?.message);
    response.json(normalizeGradePayload(content));
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : "Unknown local llama grading error.";
    response.status(500).json({ error: messageText });
  }
}

app.post("/api/grade-reply", handleGradeReply);
app.post("/api/grade-draft", handleGradeReply);

app.listen(port, "127.0.0.1", () => {
  console.log(`Simulator grading server listening on http://127.0.0.1:${port}`);
  console.log(`Expecting local llama-server at ${llamaBaseUrl}`);
});
