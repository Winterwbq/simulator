import "dotenv/config";
import express from "express";
import { access } from "node:fs/promises";
import path from "node:path";

type RubricScores = {
  Transparency: number;
  Verification: number;
  Engagement: number;
  Compliance: number;
  Tone: number;
};

type RubricDetailDimension = {
  score: number;
  positiveTriggers: string[];
  negativeTriggers: string[];
};

type RubricPenaltyFlags = {
  overconfidentClaims: number;
  dismissiveTone: number;
  noCommentStonewalling: number;
  inconsistencyCues: number;
  transparencyImpliesDelay: number;
};

type RubricDetail = {
  tooShort: boolean;
  warnings: string[];
  dimensions: Record<keyof RubricScores, RubricDetailDimension>;
  penalties: RubricPenaltyFlags;
};

type DraftGradeResult = {
  rubric_scores: RubricScores;
  trust_deltas: {
    regulator: number;
    investor: number;
    community: number;
    engineering: number;
    media: number;
  };
  rubric_detail: RubricDetail;
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
    scores: {
      type: "object",
      additionalProperties: false,
      properties: {
        Transparency: { type: "integer", minimum: 0, maximum: 2 },
        Verification: { type: "integer", minimum: 0, maximum: 2 },
        Engagement: { type: "integer", minimum: 0, maximum: 2 },
        Compliance: { type: "integer", minimum: 0, maximum: 2 },
        Tone: { type: "integer", minimum: 0, maximum: 2 },
      },
      required: ["Transparency", "Verification", "Engagement", "Compliance", "Tone"],
    },
    reasons: {
      type: "object",
      additionalProperties: false,
      properties: {
        Transparency: { type: "string" },
        Verification: { type: "string" },
        Engagement: { type: "string" },
        Compliance: { type: "string" },
        Tone: { type: "string" },
      },
      required: ["Transparency", "Verification", "Engagement", "Compliance", "Tone"],
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
    penalties: {
      type: "object",
      additionalProperties: false,
      properties: {
        overconfidentClaims: { type: "integer", minimum: 0, maximum: 2 },
        dismissiveTone: { type: "integer", minimum: 0, maximum: 2 },
        noCommentStonewalling: { type: "integer", minimum: 0, maximum: 2 },
        inconsistencyCues: { type: "integer", minimum: 0, maximum: 2 },
        transparencyImpliesDelay: { type: "integer", minimum: 0, maximum: 1 },
      },
      required: [
        "overconfidentClaims",
        "dismissiveTone",
        "noCommentStonewalling",
        "inconsistencyCues",
        "transparencyImpliesDelay",
      ],
    },
  },
  required: ["scores", "reasons", "warnings", "penalties"],
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
    statusMessage = "The local GGUF model is missing. Run `npm run dev` and wait for the model download to finish.";
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
    "Return exactly one JSON object that matches the provided schema.",
    "Keep the JSON easy to follow.",
    "Use exactly four top-level keys: `scores`, `reasons`, `warnings`, and `penalties`.",
    "Under `reasons`, write one short sentence for each rubric dimension.",
    "Do not include chain-of-thought, analysis text, think tags, channel markers, markdown fences, or prose before or after the JSON object.",
    "Score each rubric dimension from 0 to 2 using only the provided reply text.",
    "Be transparent and explainable: every score should be grounded in phrases from the draft.",
    "If the reply is weak, vague, too short, overconfident, dismissive, or evasive, score conservatively.",
    "Do not add extra keys.",
    "If `source` is `preset`, the reply text is a concise canonical summary of the preset action. Grade that summary directly without inventing missing details.",
    "",
    "Rubric dimensions:",
    "- Transparency: mentions uncertainty, limits, ongoing investigation, or what is not yet known.",
    "- Verification: mentions testing, retesting, audit, data, evidence, independent review, or validation.",
    "- Engagement: acknowledges concerns and invites questions, meetings, follow-up, or community dialogue.",
    "- Compliance: mentions reporting, documentation, safety process, oversight, or regulators.",
    "- Tone: respectful, non-hostile, non-dismissive language.",
    "",
    "Penalty cues:",
    "- overconfidentClaims: guarantees, zero-risk framing, or claims that everything is fully solved.",
    "- dismissiveTone: belittling, insulting, or brushing off stakeholders.",
    "- noCommentStonewalling: refuses to engage with the issue.",
    "- inconsistencyCues: signals spin, concealment, or mismatch with credible process.",
    "- transparencyImpliesDelay: explicitly suggests delay or postponement and may reduce investor confidence.",
    "",
    "Trust delta formulas:",
    "- regulator = 2*Transparency + 2*Compliance + 1*Verification - 2*overconfidentClaims",
    "- community = 2*Engagement + 1*Transparency - 2*dismissiveTone",
    "- engineering = 2*Verification + 1*Transparency - 1*overconfidentClaims",
    "- media = 2*Transparency + 1*Engagement - 2*noCommentStonewalling - 2*inconsistencyCues",
    "- investor = 1*Verification - 1*transparencyImpliesDelay",
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

function clampScore(value: unknown): number {
  const numericValue = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }
  return Math.max(0, Math.min(2, Math.round(numericValue)));
}

function clampPenalty(value: unknown, maxValue = 2): number {
  const numericValue = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }
  return Math.max(0, Math.min(maxValue, Math.round(numericValue)));
}

function clampTrustDelta(value: number): number {
  return Math.max(-8, Math.min(8, Math.round(value)));
}

function buildPenaltyFlags(rawPenalties: Record<string, unknown> | undefined, sourceText: string): RubricPenaltyFlags {
  const lower = sourceText.toLowerCase();

  return {
    overconfidentClaims:
      clampPenalty(rawPenalties?.overconfidentClaims) ||
      (/\b(guarantee|zero risk|no risk|fully solved|nothing to worry about)\b/.test(lower) ? 1 : 0),
    dismissiveTone:
      clampPenalty(rawPenalties?.dismissiveTone) ||
      (/\b(fake news|you people|calm down|overreacting|ridiculous|hysteria)\b/.test(lower) ? 1 : 0),
    noCommentStonewalling:
      clampPenalty(rawPenalties?.noCommentStonewalling) ||
      (/\b(no comment|cannot comment|nothing to say)\b/.test(lower) ? 1 : 0),
    inconsistencyCues:
      clampPenalty(rawPenalties?.inconsistencyCues) ||
      (/\b(off the record|ignore this|nothing to see)\b/.test(lower) ? 1 : 0),
    transparencyImpliesDelay:
      clampPenalty(rawPenalties?.transparencyImpliesDelay, 1) ||
      (/\b(delay|postpone|push back|defer)\b/.test(lower) ? 1 : 0),
  };
}

function normalizeRubricScores(raw: Record<string, unknown>): RubricScores {
  const directScores = raw.scores as Record<string, unknown> | undefined;
  const rubricScores = raw.rubric_scores as Record<string, unknown> | undefined;
  const rawDimensions = raw.dimensions as Record<string, unknown> | undefined;
  const legacyScores = raw.scores as Record<string, unknown> | undefined;

  if (rubricScores || directScores) {
    const source = rubricScores ?? directScores ?? {};
    return {
      Transparency: clampScore(source.Transparency),
      Verification: clampScore(source.Verification),
      Engagement: clampScore(source.Engagement),
      Compliance: clampScore(source.Compliance),
      Tone: clampScore(source.Tone),
    };
  }

  if (rawDimensions) {
    return {
      Transparency: clampScore(rawDimensions.Transparency),
      Verification: clampScore(rawDimensions.Verification),
      Engagement: clampScore(rawDimensions.Engagement),
      Compliance: clampScore(rawDimensions.Compliance),
      Tone: clampScore(rawDimensions.Tone),
    };
  }

  return {
    Transparency: clampScore(legacyScores?.clarity_and_completeness),
    Verification: clampScore(legacyScores?.relevance_and_substance),
    Engagement: clampScore(legacyScores?.relevance_and_substance),
    Compliance: clampScore(legacyScores?.clarity_and_completeness),
    Tone: clampScore(legacyScores?.tone_and_professionalism),
  };
}

function normalizeRubricDetail(
  raw: Record<string, unknown>,
  rubricScores: RubricScores,
  replyText: string,
): RubricDetail {
  const rawDetail = (raw.detail ?? raw.rubric_detail ?? raw) as Record<string, unknown>;
  const rawDimensions = rawDetail.dimensions as Record<string, unknown> | undefined;
  const rawReasons = (raw.reasons ?? raw.reasoning ?? raw.detail) as Record<string, unknown> | string | undefined;
  const rawJustifications = raw.justifications as Record<string, unknown> | undefined;
  const warningsSource = Array.isArray(raw.warnings)
    ? raw.warnings
    : Array.isArray(rawDetail.warnings)
      ? rawDetail.warnings
      : [];
  const warnings = warningsSource.filter((item): item is string => typeof item === "string");

  const getReasonText = (name: keyof RubricScores, legacyKey?: string): string[] => {
    if (rawReasons && typeof rawReasons === "object" && typeof rawReasons[name] === "string") {
      return [String(rawReasons[name])];
    }

    if (typeof rawReasons === "string") {
      return [rawReasons];
    }

    if (typeof rawJustifications?.[legacyKey ?? name] === "string") {
      return [String(rawJustifications[legacyKey ?? name])];
    }

    return [];
  };

  const buildDimension = (name: keyof RubricScores, legacyKey?: string): RubricDetailDimension => {
    const value = rawDimensions?.[name];
    if (value && typeof value === "object") {
      const objectValue = value as Record<string, unknown>;
      return {
        score: clampScore(objectValue.score ?? rubricScores[name]),
        positiveTriggers: Array.isArray(objectValue.positiveTriggers)
          ? objectValue.positiveTriggers.filter((item): item is string => typeof item === "string")
          : [],
        negativeTriggers: Array.isArray(objectValue.negativeTriggers)
          ? objectValue.negativeTriggers.filter((item): item is string => typeof item === "string")
          : [],
      };
    }

    const notes = getReasonText(name, legacyKey);
    const positiveTriggers = rubricScores[name] > 0 ? notes : [];
    const negativeTriggers = rubricScores[name] === 0 ? notes : [];

    return {
      score: clampScore(value ?? rubricScores[name]),
      positiveTriggers,
      negativeTriggers,
    };
  };

  return {
    tooShort:
      typeof rawDetail.tooShort === "boolean"
        ? rawDetail.tooShort
        : replyText.trim().length < 30,
    warnings,
    dimensions: {
      Transparency: buildDimension("Transparency", "clarity_and_completeness"),
      Verification: buildDimension("Verification", "relevance_and_substance"),
      Engagement: buildDimension("Engagement", "relevance_and_substance"),
      Compliance: buildDimension("Compliance", "clarity_and_completeness"),
      Tone: buildDimension("Tone", "tone_and_professionalism"),
    },
    penalties: buildPenaltyFlags(
      ((raw.penalties && typeof raw.penalties === "object"
        ? raw.penalties
        : rawDetail.penalties && typeof rawDetail.penalties === "object"
          ? rawDetail.penalties
          : undefined) as Record<string, unknown> | undefined),
      `${replyText} ${warnings.join(" ")} ${JSON.stringify(rawJustifications ?? {})}`,
    ),
  };
}

function computeTrustDeltas(rubricScores: RubricScores, rubricDetail: RubricDetail): DraftGradeResult["trust_deltas"] {
  const penalties = rubricDetail.penalties;

  return {
    regulator: clampTrustDelta(
      2 * rubricScores.Transparency +
        2 * rubricScores.Compliance +
        rubricScores.Verification -
        2 * penalties.overconfidentClaims,
    ),
    community: clampTrustDelta(
      2 * rubricScores.Engagement +
        rubricScores.Transparency -
        2 * penalties.dismissiveTone,
    ),
    engineering: clampTrustDelta(
      2 * rubricScores.Verification +
        rubricScores.Transparency -
        penalties.overconfidentClaims,
    ),
    media: clampTrustDelta(
      2 * rubricScores.Transparency +
        rubricScores.Engagement -
        2 * penalties.noCommentStonewalling -
        2 * penalties.inconsistencyCues,
    ),
    investor: clampTrustDelta(
      rubricScores.Verification - penalties.transparencyImpliesDelay,
    ),
  };
}

function normalizeGradePayload(rawPayload: string, replyText: string): DraftGradeResult {
  const parsed = JSON.parse(extractJsonObject(rawPayload)) as Record<string, unknown>;
  const rubric_scores = normalizeRubricScores(parsed);
  const rubric_detail = normalizeRubricDetail(parsed, rubric_scores, replyText);
  const trust_deltas = computeTrustDeltas(rubric_scores, rubric_detail);

  return {
    rubric_scores,
    rubric_detail,
    trust_deltas,
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
        max_tokens: 350,
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
    response.json(normalizeGradePayload(content, replyText));
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
