import {
  DEADLINE_CONSEQUENCE,
  DEADLINE_DELIVERABLE,
  DEADLINE_LABEL,
  DEADLINE_MINUTES,
  DECISION_SUMMARIES,
  DECISION_TIME_INCREMENT,
  DEFAULT_TIME_MINUTES,
  ENDING_PATTERN,
  STAKEHOLDER_EFFECT_LABELS,
  STORAGE_KEY,
} from "./constants";
import { KNOWN_STAKEHOLDERS } from "./types";
import type {
  Choice,
  DraftComposerState,
  DraftGradeResult,
  DraftPlayLogEntry,
  Ending,
  KnownStakeholder,
  Message,
  QuickFilter,
  ReplyType,
  RubricDetail,
  RubricScores,
  SimulationState,
  Story,
  TrustScores,
} from "./types";

export function clampTrust(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function formatDayTime(totalMinutes: number): string {
  const minutesInDay = totalMinutes % (24 * 60);
  const hours = Math.floor(minutesInDay / 60);
  const minutes = minutesInDay % 60;
  return `Day 1, ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatDuration(totalMinutes: number): string {
  const safeMinutes = Math.max(0, totalMinutes);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}

export function getTimeRemaining(currentMinutes: number): number {
  return Math.max(0, DEADLINE_MINUTES - currentMinutes);
}

export function getDeadlineProgressMax(): number {
  return DEADLINE_MINUTES - DEFAULT_TIME_MINUTES;
}

export function getDeadlineProgressValue(currentMinutes: number): number {
  return Math.min(getDeadlineProgressMax(), Math.max(0, getTimeRemaining(currentMinutes)));
}

export function getDeadlineSummary() {
  return {
    dueLabel: DEADLINE_LABEL,
    deliverable: DEADLINE_DELIVERABLE,
    consequence: DEADLINE_CONSEQUENCE,
  };
}

export function initializeSimulation(story: Story): SimulationState {
  const meta = story.meta;
  const startMessages = Array.from(new Set(meta.start_messages));
  const initialTrust = KNOWN_STAKEHOLDERS.reduce<TrustScores>((accumulator, stakeholder) => {
    accumulator[stakeholder] = clampTrust(meta.initial_trust[stakeholder]);
    return accumulator;
  }, {} as TrustScores);

  return {
    simInitialized: true,
    storyTitle: meta.title,
    availableIds: startMessages,
    openedIds: [],
    handledIds: [],
    selectedMessageId: startMessages[0] ?? null,
    trust: initialTrust,
    logEntries: [`Simulation started as ${meta.role} in ${meta.setting}.`],
    decisionLog: [],
    playLog: [],
    trustHistory: [{ step_index: 0, label: "Start", trust: { ...initialTrust } }],
    searchQuery: "",
    quickFilter: "All",
    stakeholderFilter: "All",
    currentMinutes: DEFAULT_TIME_MINUTES,
    deadlineLabel: DEADLINE_LABEL,
    lastTimeAdvanceNotice: "",
    lastReplyPreview: "",
    ending: null,
    simulationComplete: false,
    showStartPrompt: true,
    draftReplies: {},
    lastDraftEvaluation: null,
    draftSubmissionError: null,
    draftSubmissionPending: false,
  };
}

function isTrustScores(value: unknown): value is TrustScores {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return KNOWN_STAKEHOLDERS.every((stakeholder) => typeof (value as TrustScores)[stakeholder] === "number");
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isDraftComposerState(value: unknown): value is DraftComposerState {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as DraftComposerState).text === "string" &&
    typeof (value as DraftComposerState).replyType === "string"
  );
}

function isDraftComposerMap(value: unknown): value is Record<string, DraftComposerState> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every((entry) => isDraftComposerState(entry))
  );
}

export function loadSimulationState(story: Story): SimulationState {
  const fallback = initializeSimulation(story);
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SimulationState>;
    if (
      parsed.storyTitle !== story.meta.title ||
      !isStringArray(parsed.availableIds) ||
      !isStringArray(parsed.openedIds) ||
      !isStringArray(parsed.handledIds) ||
      !isTrustScores(parsed.trust)
    ) {
      return fallback;
    }

    return {
      ...fallback,
      ...parsed,
      trust: parsed.trust,
      availableIds: parsed.availableIds,
      openedIds: parsed.openedIds,
      handledIds: parsed.handledIds,
      decisionLog: Array.isArray(parsed.decisionLog) ? parsed.decisionLog : fallback.decisionLog,
      playLog: Array.isArray(parsed.playLog) ? parsed.playLog : fallback.playLog,
      trustHistory: Array.isArray(parsed.trustHistory) ? parsed.trustHistory : fallback.trustHistory,
      logEntries: Array.isArray(parsed.logEntries) ? parsed.logEntries : fallback.logEntries,
      quickFilter: isQuickFilter(parsed.quickFilter) ? parsed.quickFilter : fallback.quickFilter,
      showStartPrompt:
        typeof parsed.showStartPrompt === "boolean" ? parsed.showStartPrompt : false,
      draftReplies: isDraftComposerMap(parsed.draftReplies) ? parsed.draftReplies : fallback.draftReplies,
      lastDraftEvaluation:
        parsed.lastDraftEvaluation && typeof parsed.lastDraftEvaluation === "object"
          ? (parsed.lastDraftEvaluation as DraftPlayLogEntry)
          : fallback.lastDraftEvaluation,
      draftSubmissionError:
        typeof parsed.draftSubmissionError === "string"
          ? parsed.draftSubmissionError
          : fallback.draftSubmissionError,
      draftSubmissionPending: false,
    };
  } catch {
    return fallback;
  }
}

export function persistSimulationState(state: SimulationState): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetPersistedSimulationState(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function markMessageOpened(state: SimulationState, messageId: string): SimulationState {
  if (state.openedIds.includes(messageId)) {
    return state;
  }
  return {
    ...state,
    openedIds: [...state.openedIds, messageId],
  };
}

export function updateDraftReply(
  state: SimulationState,
  messageId: string,
  patch: Partial<DraftComposerState>,
): SimulationState {
  const existing = state.draftReplies[messageId] ?? {
    text: "",
    replyType: "Public statement" as ReplyType,
  };

  return {
    ...state,
    draftReplies: {
      ...state.draftReplies,
      [messageId]: {
        ...existing,
        ...patch,
      },
    },
  };
}

function advanceTime(currentMinutes: number, minutes = DECISION_TIME_INCREMENT): number {
  return currentMinutes + minutes;
}

export function applyChoice(
  story: Story,
  state: SimulationState,
  messageId: string,
  choiceIndex: number,
): SimulationState {
  if (state.handledIds.includes(messageId)) {
    return state;
  }

  const message = story.messages[messageId];
  const choice = message.choices[choiceIndex];
  const stepIndex = state.decisionLog.length + 1;
  const openedIds = state.openedIds.includes(messageId) ? state.openedIds : [...state.openedIds, messageId];
  const handledIds = [...state.handledIds, messageId];
  const availableIds = [...state.availableIds];
  const unlockedNow: string[] = [];

  for (const nextId of choice.next) {
    if (!availableIds.includes(nextId)) {
      availableIds.push(nextId);
      unlockedNow.push(nextId);
    }
  }

  const trust = { ...state.trust };
  for (const [stakeholder, delta] of Object.entries(choice.effects)) {
    const key = stakeholder as KnownStakeholder;
    trust[key] = clampTrust(trust[key] + Number(delta));
  }

  const decisionLog = [
    ...state.decisionLog,
    {
      step_index: stepIndex,
      message_id: messageId,
      subject: message.subject || messageId,
      choice_label: choice.label,
      effects: { ...choice.effects },
    },
  ];
  const trustHistory = [
    ...state.trustHistory,
    {
      step_index: stepIndex,
      label: message.subject || messageId,
      trust: { ...trust },
    },
  ];
  const logEntries = [...state.logEntries];
  const logLine = choice.log.trim();
  if (logLine) {
    logEntries.push(`You chose: ${logLine}`);
  }
  if (unlockedNow.length > 0) {
    const unlockedSubjects = unlockedNow.map((nextId) => story.messages[nextId].subject).join(", ");
    logEntries.push(`New emails unlocked: ${unlockedSubjects}.`);
  }

  const currentMinutes = advanceTime(state.currentMinutes);
  const ending = checkEndings(story.endings, trust);
  const nextBaseState: SimulationState = {
    ...state,
    availableIds,
    openedIds,
    handledIds,
    trust,
    decisionLog,
    trustHistory,
    logEntries,
    currentMinutes,
    lastReplyPreview: generateDraftReplyPreview(message, choice),
    lastTimeAdvanceNotice: `Time advanced to ${formatDayTime(currentMinutes)}.`,
    ending,
    simulationComplete: ending ? false : allActionableMessagesHandled(story, availableIds, handledIds),
    selectedMessageId: null,
  };

  return {
    ...nextBaseState,
    selectedMessageId: pickNextMessage(nextBaseState),
  };
}

type CuePattern = {
  label: string;
  pattern: RegExp;
};

const POSITIVE_CUES: Record<keyof RubricScores, CuePattern[]> = {
  Transparency: [
    { label: "uncertainty", pattern: /\buncertain(?:ty)?\b/ },
    { label: "limits", pattern: /\blimit(?:s|ation|ations)?\b/ },
    { label: "investigating", pattern: /\binvestigat(?:e|es|ed|ing|ion)\b/ },
    { label: "reviewing", pattern: /\breview(?:ing|ed)?\b/ },
    { label: "assessing", pattern: /\bassess(?:ing|ment)?\b/ },
    { label: "preliminary", pattern: /\bpreliminary\b/ },
    { label: "what we know / do not know", pattern: /\b(do not know|don't know|what we know|what we do not know)\b/ },
    { label: "updating as we learn more", pattern: /\b(update|updates|updated)\b.*\b(as|when)\b.*\b(learn|know|confirm)\b/ },
    { label: "share more information", pattern: /\bshare\b.*\b(data|information|updates?)\b/ },
  ],
  Verification: [
    { label: "independent review", pattern: /\b(independent|outside|external)\s+(review|audit)\b/ },
    { label: "testing", pattern: /\b(test|tests|testing|retest|retesting)\b/ },
    { label: "audit", pattern: /\baudit(?:ed|ing)?\b/ },
    { label: "data", pattern: /\bdata\b/ },
    { label: "evidence", pattern: /\bevidence\b/ },
    { label: "verification", pattern: /\bverif(?:y|ied|ication|ying)\b/ },
    { label: "documentation", pattern: /\bdocumentation|documented|documenting\b/ },
  ],
  Engagement: [
    { label: "acknowledges concerns", pattern: /\b(concern|concerns|worried|worry|question|questions)\b/ },
    { label: "invites questions", pattern: /\b(invite|welcome|take|answer)\b.*\b(question|questions)\b/ },
    { label: "meeting", pattern: /\b(meeting|meet|briefing|forum)\b/ },
    { label: "town hall", pattern: /\btown hall\b/ },
    { label: "listening", pattern: /\b(listen|listening|hear|hearing)\b/ },
    { label: "community", pattern: /\b(community|neighbor|neighbors|resident|residents)\b/ },
    { label: "follow-up", pattern: /\bfollow[\s-]?up\b/ },
  ],
  Compliance: [
    { label: "regulator", pattern: /\bregulator|regulators|regulatory\b/ },
    { label: "reporting", pattern: /\breport(?:ing|ed)?\b/ },
    { label: "safety process", pattern: /\bsafety\s+(process|review|protocol)\b/ },
    { label: "documentation", pattern: /\bdocument(?:ation|ed|ing)\b/ },
    { label: "filing", pattern: /\bfil(?:e|ing|ed)\b/ },
    { label: "permit", pattern: /\bpermit|permitting\b/ },
    { label: "compliance", pattern: /\bcompliance\b/ },
    { label: "oversight", pattern: /\boversight\b/ },
  ],
  Tone: [
    { label: "thank you", pattern: /\bthank you\b/ },
    { label: "appreciate", pattern: /\bappreciat(?:e|es|ed|ing)\b/ },
    { label: "respectfully", pattern: /\brespect(?:ful|fully)?\b/ },
    { label: "understand", pattern: /\bunders?tand|recognize\b/ },
    { label: "committed", pattern: /\bcommitt(?:ed|ing|ment)\b/ },
    { label: "we hear", pattern: /\bwe hear\b/ },
  ],
};

const NEGATIVE_CUES: Record<keyof RubricScores, CuePattern[]> = {
  Transparency: [
    { label: "guarantee", pattern: /\bguarante(?:e|ed|es)\b/ },
    { label: "no risk", pattern: /\b(no|zero)\s+risk\b/ },
    { label: "nothing to see", pattern: /\bnothing to see\b/ },
    { label: "nothing to worry about", pattern: /\bnothing to worry about\b/ },
    { label: "fully solved", pattern: /\bfully solved\b/ },
  ],
  Verification: [
    { label: "trust us", pattern: /\btrust us\b/ },
    { label: "no need to review", pattern: /\bno need to review\b/ },
    { label: "already proven", pattern: /\balready proven\b/ },
  ],
  Engagement: [
    { label: "stop asking", pattern: /\bstop asking\b/ },
    { label: "nothing to discuss", pattern: /\bnothing to discuss\b/ },
    { label: "not your concern", pattern: /\bnot your concern\b/ },
  ],
  Compliance: [
    { label: "skip reporting", pattern: /\bskip reporting\b/ },
    { label: "avoid the regulator", pattern: /\bavoid the regulator\b/ },
    { label: "off the record", pattern: /\boff the record\b/ },
  ],
  Tone: [
    { label: "fake news", pattern: /\bfake news\b/ },
    { label: "you people", pattern: /\byou people\b/ },
    { label: "overreacting", pattern: /\boverreact(?:ing)?\b/ },
    { label: "calm down", pattern: /\bcalm down\b/ },
    { label: "ridiculous", pattern: /\bridiculous\b/ },
    { label: "hysteria", pattern: /\bhysteria\b/ },
  ],
};

const PENALTY_KEYWORDS = {
  overconfidentClaims: [
    "guarantee",
    "guaranteed",
    "no risk",
    "zero risk",
    "perfectly safe",
    "nothing to worry about",
    "fully solved",
  ],
  dismissiveTone: ["you people", "overreacting", "calm down", "nothing to see", "stop asking"],
  noCommentStonewalling: ["no comment", "cannot comment", "won't comment", "will not comment"],
  inconsistencyCues: ["ignore rumors", "stick to the narrative", "do not mention", "say nothing", "routine issue"],
  delayCues: ["delay", "delayed", "postpone", "postponed", "slip", "slipped", "pause", "reschedule"],
};

function collectMatches(text: string, phrases: string[]): string[] {
  return phrases.filter((phrase) => text.includes(phrase));
}

function normalizeForMatching(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9'\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

function collectCueMatches(text: string, cues: CuePattern[]): string[] {
  return cues.flatMap((cue) => (cue.pattern.test(text) ? [cue.label] : []));
}

function scoreDimension(positiveMatches: string[], negativeMatches: string[], neutralTone: boolean): number {
  if (neutralTone) {
    return negativeMatches.length > 0 ? 0 : 1;
  }

  const base = positiveMatches.length >= 2 ? 2 : positiveMatches.length === 1 ? 1 : 0;
  return Math.max(0, Math.min(2, base - (negativeMatches.length > 0 ? 1 : 0)));
}

export function gradeReply(
  text: string,
  replyType: ReplyType,
): [Partial<Record<KnownStakeholder, number>>, RubricDetail, RubricScores] {
  const normalized = normalizeForMatching(text.trim());
  const tooShort = normalized.length <= 30;
  const warnings = tooShort ? ["Reply too short to evaluate reliably."] : [];

  const dimensions = {
    Transparency: { score: 0, positiveTriggers: [] as string[], negativeTriggers: [] as string[] },
    Verification: { score: 0, positiveTriggers: [] as string[], negativeTriggers: [] as string[] },
    Engagement: { score: 0, positiveTriggers: [] as string[], negativeTriggers: [] as string[] },
    Compliance: { score: 0, positiveTriggers: [] as string[], negativeTriggers: [] as string[] },
    Tone: { score: 0, positiveTriggers: [] as string[], negativeTriggers: [] as string[] },
  };

  if (!tooShort) {
    (Object.keys(dimensions) as (keyof RubricScores)[]).forEach((dimension) => {
      const positiveMatches = collectCueMatches(normalized, POSITIVE_CUES[dimension]);
      const negativeMatches = collectCueMatches(normalized, NEGATIVE_CUES[dimension]);
      dimensions[dimension] = {
        score:
          dimension === "Tone"
            ? scoreDimension(positiveMatches, negativeMatches, positiveMatches.length === 0)
            : scoreDimension(positiveMatches, negativeMatches, false),
        positiveTriggers: positiveMatches,
        negativeTriggers: negativeMatches,
      };
    });
  }

  const overconfidentClaims = tooShort
    ? 0
    : Math.min(2, collectMatches(normalized, PENALTY_KEYWORDS.overconfidentClaims).length);
  const dismissiveTone = tooShort
    ? 0
    : Math.min(2, collectMatches(normalized, PENALTY_KEYWORDS.dismissiveTone).length);
  const noCommentStonewalling = tooShort
    ? 0
    : Math.min(2, collectMatches(normalized, PENALTY_KEYWORDS.noCommentStonewalling).length);
  const inconsistencyCues = tooShort
    ? 0
    : Math.min(2, collectMatches(normalized, PENALTY_KEYWORDS.inconsistencyCues).length);
  const transparencyImpliesDelay =
    tooShort || dimensions.Transparency.score === 0
      ? 0
      : collectMatches(normalized, PENALTY_KEYWORDS.delayCues).length > 0 &&
          replyType !== "Internal update"
        ? 1
        : 0;

  const rubricScores: RubricScores = {
    Transparency: dimensions.Transparency.score,
    Verification: dimensions.Verification.score,
    Engagement: dimensions.Engagement.score,
    Compliance: dimensions.Compliance.score,
    Tone: dimensions.Tone.score,
  };

  const deltas: Partial<Record<KnownStakeholder, number>> = {
    regulator:
      2 * rubricScores.Transparency +
      2 * rubricScores.Compliance +
      rubricScores.Verification -
      2 * overconfidentClaims,
    community:
      2 * rubricScores.Engagement +
      rubricScores.Transparency -
      2 * dismissiveTone,
    engineering:
      2 * rubricScores.Verification +
      rubricScores.Transparency -
      overconfidentClaims,
    media:
      2 * rubricScores.Transparency +
      rubricScores.Engagement -
      2 * noCommentStonewalling -
      2 * inconsistencyCues,
    investor:
      rubricScores.Verification - transparencyImpliesDelay,
  };

  (Object.keys(deltas) as KnownStakeholder[]).forEach((stakeholder) => {
    deltas[stakeholder] = Math.max(-8, Math.min(8, deltas[stakeholder] ?? 0));
  });

  const rubricDetail: RubricDetail = {
    tooShort,
    warnings,
    dimensions,
    penalties: {
      overconfidentClaims,
      dismissiveTone,
      noCommentStonewalling,
      inconsistencyCues,
      transparencyImpliesDelay,
    },
  };

  return [deltas, rubricDetail, rubricScores];
}

function getDraftUnlockIds(story: Story, message: Message): string[] {
  const unionIds = Array.from(
    new Set(message.choices.flatMap((choice) => choice.next)),
  ).filter((messageId) => messageId in story.messages);

  if (unionIds.length > 0) {
    return unionIds;
  }

  return "followup_generic" in story.messages ? ["followup_generic"] : [];
}

export function applyDraftedReply(
  story: Story,
  state: SimulationState,
  messageId: string,
  gradedResult?: DraftGradeResult,
): SimulationState {
  if (state.handledIds.includes(messageId)) {
    return state;
  }

  const message = story.messages[messageId];
  const composer = state.draftReplies[messageId] ?? {
    text: "",
    replyType: "Public statement" as ReplyType,
  };
  const draftedReplyText = composer.text.trim();
  const [fallbackTrustDeltas, fallbackRubricDetail, fallbackRubricScores] = gradeReply(
    draftedReplyText,
    composer.replyType,
  );
  const trustDeltas = gradedResult?.trust_deltas ?? fallbackTrustDeltas;
  const rubricDetail = gradedResult?.rubric_detail ?? fallbackRubricDetail;
  const rubricScores = gradedResult?.rubric_scores ?? fallbackRubricScores;
  const stepIndex = state.decisionLog.length + 1;
  const openedIds = state.openedIds.includes(messageId) ? state.openedIds : [...state.openedIds, messageId];
  const handledIds = [...state.handledIds, messageId];
  const availableIds = [...state.availableIds];
  const unlockedNow: string[] = [];

  for (const nextId of getDraftUnlockIds(story, message)) {
    if (!availableIds.includes(nextId)) {
      availableIds.push(nextId);
      unlockedNow.push(nextId);
    }
  }

  const trust = { ...state.trust };
  for (const stakeholder of KNOWN_STAKEHOLDERS) {
    trust[stakeholder] = clampTrust(trust[stakeholder] + Number(trustDeltas[stakeholder] ?? 0));
  }

  const decisionLog = [
    ...state.decisionLog,
    {
      step_index: stepIndex,
      message_id: messageId,
      subject: message.subject || messageId,
      choice_label: `Drafted reply (${composer.replyType})`,
      effects: { ...trustDeltas },
    },
  ];

  const playLogEntry: DraftPlayLogEntry = {
    step_index: stepIndex,
    message_id: messageId,
    subject: message.subject || messageId,
    drafted_reply_text: draftedReplyText,
    reply_type: composer.replyType,
    rubric_scores: rubricScores,
    trust_deltas: { ...trustDeltas },
    rubric_detail: rubricDetail,
  };

  const trustHistory = [
    ...state.trustHistory,
    {
      step_index: stepIndex,
      label: message.subject || messageId,
      trust: { ...trust },
    },
  ];

  const logEntries = [...state.logEntries];
  logEntries.push(`You drafted a ${composer.replyType.toLowerCase()} for "${message.subject}".`);
  if (rubricDetail.warnings.length > 0) {
    rubricDetail.warnings.forEach((warning) => logEntries.push(`Draft warning: ${warning}`));
  }
  if (unlockedNow.length > 0) {
    const unlockedSubjects = unlockedNow.map((nextId) => story.messages[nextId].subject).join(", ");
    logEntries.push(`New emails unlocked: ${unlockedSubjects}.`);
  }

  const currentMinutes = advanceTime(state.currentMinutes);
  const ending = checkEndings(story.endings, trust);
  const nextDraftReplies = { ...state.draftReplies };
  delete nextDraftReplies[messageId];

  const nextBaseState: SimulationState = {
    ...state,
    availableIds,
    openedIds,
    handledIds,
    trust,
    decisionLog,
    playLog: [...state.playLog, playLogEntry],
    trustHistory,
    logEntries,
    currentMinutes,
    lastReplyPreview: draftedReplyText,
    lastTimeAdvanceNotice: `Time advanced to ${formatDayTime(currentMinutes)}.`,
    ending,
    simulationComplete: ending ? false : allActionableMessagesHandled(story, availableIds, handledIds),
    selectedMessageId: null,
    draftReplies: nextDraftReplies,
    lastDraftEvaluation: playLogEntry,
    draftSubmissionError: null,
    draftSubmissionPending: false,
  };

  return {
    ...nextBaseState,
    selectedMessageId: pickNextMessage(nextBaseState),
  };
}

export function allActionableMessagesHandled(
  story: Story,
  availableIds: string[],
  handledIds: string[],
): boolean {
  return availableIds.every((messageId) => {
    const message = story.messages[messageId];
    return message.choices.length === 0 || handledIds.includes(messageId);
  });
}

export function pickNextMessage(state: Pick<SimulationState, "availableIds" | "handledIds">): string | null {
  const nextUnreadActionable = state.availableIds.find((messageId) => !state.handledIds.includes(messageId));
  return nextUnreadActionable ?? state.availableIds[0] ?? null;
}

export function parseCondition(rule: string): [string, number] | null {
  const match = ENDING_PATTERN.exec(rule.trim());
  if (!match) {
    return null;
  }
  return [match[1], Number.parseInt(match[2], 10)];
}

export function evaluateCondition(currentValue: number, rule: string): boolean {
  const parsed = parseCondition(rule);
  if (!parsed) {
    return false;
  }

  const [operator, threshold] = parsed;
  if (operator === ">=") {
    return currentValue >= threshold;
  }
  if (operator === "<=") {
    return currentValue <= threshold;
  }
  if (operator === ">") {
    return currentValue > threshold;
  }
  return currentValue < threshold;
}

export function checkEndings(endings: Ending[], trust: TrustScores): Ending | null {
  for (const ending of endings) {
    if (Object.entries(ending.condition).every(([stakeholder, rule]) => evaluateCondition(trust[stakeholder as KnownStakeholder], rule))) {
      return ending;
    }
  }
  return null;
}

export function buildExportText(story: Story, state: SimulationState): string {
  const lines = [
    story.meta.title,
    `Role: ${story.meta.role}`,
    `Setting: ${story.meta.setting}`,
    "",
    "Trust scores:",
  ];

  for (const stakeholder of KNOWN_STAKEHOLDERS) {
    lines.push(`- ${stakeholder}: ${state.trust[stakeholder]}`);
  }

  if (state.ending) {
    lines.push("", `Ending: ${state.ending.name}`, state.ending.text);
  } else if (state.simulationComplete) {
    lines.push("", "Status: Simulation complete (no ending triggered).");
  } else {
    lines.push("", "Status: In progress");
  }

  lines.push("", "Playthrough log:");
  state.logEntries.forEach((entry, index) => {
    lines.push(`${index + 1}. ${entry}`);
  });

  return lines.join("\n");
}

export function getLastDecisionEffects(state: SimulationState): Record<KnownStakeholder, number> {
  if (state.decisionLog.length === 0) {
    return KNOWN_STAKEHOLDERS.reduce(
      (accumulator, stakeholder) => ({ ...accumulator, [stakeholder]: 0 }),
      {} as Record<KnownStakeholder, number>,
    );
  }

  const lastEffects = state.decisionLog[state.decisionLog.length - 1].effects;
  return KNOWN_STAKEHOLDERS.reduce((accumulator, stakeholder) => {
    accumulator[stakeholder] = Number(lastEffects[stakeholder] ?? 0);
    return accumulator;
  }, {} as Record<KnownStakeholder, number>);
}

export function formatDeltaText(value: number): string {
  if (value > 0) {
    return `↑${value}`;
  }
  if (value < 0) {
    return `↓${Math.abs(value)}`;
  }
  return "0";
}

export function buildConsequenceHint(effects: Partial<Record<KnownStakeholder, number>>): string {
  if (Object.keys(effects).length === 0) {
    return "Likely: no major trust shift";
  }

  const parts = KNOWN_STAKEHOLDERS.flatMap((stakeholder) => {
    const delta = effects[stakeholder];
    if (!delta) {
      return [];
    }
    const sign = delta > 0 ? "+" : "-";
    return [`${sign}${STAKEHOLDER_EFFECT_LABELS[stakeholder]}`];
  });

  return `Likely: ${parts.length > 0 ? parts.join(", ") : "mixed signals with little net movement"}`;
}

export function generateDraftReplyPreview(message: Message, choice: Choice): string {
  const actionLine = choice.log.trim() || choice.label;
  return [
    `To: ${message.from}`,
    `Subject: Re: ${message.subject}`,
    "",
    "Thanks for flagging this so quickly.",
    `We are proceeding with the following response: ${actionLine}.`,
    "I will keep you updated as stakeholder outreach and review steps move forward.",
  ].join("\n");
}

export function extractDecisionSummary(message: Message): string {
  if (DECISION_SUMMARIES[message.id]) {
    return DECISION_SUMMARIES[message.id];
  }

  const sentences = message.body
    .split(/\s+/)
    .join(" ")
    .split(/(?<=[.!?])\s+/);
  for (const sentence of sentences) {
    const lowered = sentence.toLowerCase();
    if (lowered.startsWith("we can") || lowered.startsWith("decision") || lowered.startsWith("either")) {
      return `Decision: ${sentence}`;
    }
  }
  return `Decision: How should you respond to '${message.subject}'?`;
}

export function extractAttachments(message: Message): string[] {
  const attachments: string[] = [];

  if (typeof message.attachment === "string" && message.attachment.trim()) {
    attachments.push(message.attachment.trim());
  }

  if (Array.isArray(message.attachments)) {
    for (const item of message.attachments) {
      if (typeof item === "string" && item.trim()) {
        attachments.push(item.trim());
      }
    }
  }

  for (const line of message.body.split("\n")) {
    if (line.toLowerCase().startsWith("attachment:")) {
      const value = line.split(":", 2)[1]?.trim();
      if (value) {
        attachments.push(value);
      }
    }
  }

  for (const link of message.body.match(/https?:\/\/\S+/g) ?? []) {
    attachments.push(link.replace(/[).,]+$/, ""));
  }

  return Array.from(new Set(attachments));
}

export function messageMatchesSearch(message: Message, query: string): boolean {
  if (!query) {
    return true;
  }
  const haystack = [message.from, message.subject, message.body].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function getFilteredMessageIds(story: Story, state: SimulationState): string[] {
  const query = state.searchQuery.trim();
  const quickFilter = state.quickFilter;
  const stakeholderFilter = state.stakeholderFilter;

  return state.availableIds.filter((messageId) => {
    const message = story.messages[messageId];
    if (stakeholderFilter !== "All" && message.stakeholder !== stakeholderFilter) {
      return false;
    }
    if (quickFilter === "Unread" && state.openedIds.includes(messageId)) {
      return false;
    }
    if (quickFilter === "Resolved" && !state.handledIds.includes(messageId)) {
      return false;
    }
    return messageMatchesSearch(message, query);
  });
}

export function messageStatusLabel(state: SimulationState, messageId: string): string {
  if (state.handledIds.includes(messageId)) {
    return "Handled";
  }
  if (state.openedIds.includes(messageId)) {
    return "Read";
  }
  return "Unread";
}

export function slugifyFilename(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return slug || "playthrough";
}

export function getTrustBand(value: number): [string, string, string] {
  if (value <= 29) {
    return [
      "Low trust",
      "trust-band-low",
      "Low trust means this stakeholder is skeptical and likely to escalate scrutiny.",
    ];
  }
  if (value <= 49) {
    return [
      "Fragile",
      "trust-band-fragile",
      "Fragile trust means support could drop quickly if your next move feels evasive.",
    ];
  }
  if (value <= 69) {
    return [
      "Stable",
      "trust-band-stable",
      "Stable trust means confidence is holding, but it still depends on follow-through.",
    ];
  }
  return [
    "High trust",
    "trust-band-high",
    "High trust means this stakeholder sees your decisions as credible and well-governed.",
  ];
}

export function formatEffects(effects: Partial<Record<KnownStakeholder, number>>): string {
  if (Object.keys(effects).length === 0) {
    return "No trust change";
  }

  return KNOWN_STAKEHOLDERS.filter((stakeholder) => effects[stakeholder] !== undefined)
    .map((stakeholder) => `${capitalize(stakeholder)} ${Number(effects[stakeholder]).toString().replace(/^/, Number(effects[stakeholder]) >= 0 ? "+" : "")}`)
    .join(", ");
}

export function getTotalDeltas(state: SimulationState): Record<KnownStakeholder, number> {
  const totals = KNOWN_STAKEHOLDERS.reduce((accumulator, stakeholder) => {
    accumulator[stakeholder] = 0;
    return accumulator;
  }, {} as Record<KnownStakeholder, number>);

  for (const entry of state.decisionLog) {
    for (const [stakeholder, delta] of Object.entries(entry.effects)) {
      totals[stakeholder as KnownStakeholder] += Number(delta);
    }
  }

  return totals;
}

export function explainStakeholderOutcome(stakeholder: KnownStakeholder, totalDelta: number): string {
  const drivers: Record<KnownStakeholder, { positive: string; negative: string }> = {
    regulator: {
      positive: "you prioritized transparency, early notice, and outside review",
      negative: "you delayed disclosure and made oversight feel too tightly managed",
    },
    investor: {
      positive: "you projected governance discipline and gave investors a clearer basis for confidence",
      negative: "you made execution feel less predictable or raised doubts about commercialization readiness",
    },
    community: {
      positive: "you emphasized visible engagement and treated local concerns as part of governance",
      negative: "you delayed direct engagement and let residents feel decisions were happening around them",
    },
    engineering: {
      positive: "you supported technical rigor and let uncertainty be discussed honestly",
      negative: "you emphasized speed over technical candor and flattened engineering concerns",
    },
    media: {
      positive: "you gave reporters timely, consistent information instead of letting rumor fill the gap",
      negative: "you allowed delayed public response or inconsistent messaging to shape the story",
    },
  };

  if (totalDelta >= 10) {
    return `Trust improved substantially because ${drivers[stakeholder].positive}.`;
  }
  if (totalDelta > 0) {
    return `Trust improved modestly because ${drivers[stakeholder].positive}.`;
  }
  if (totalDelta <= -10) {
    return `Trust fell sharply because ${drivers[stakeholder].negative}.`;
  }
  if (totalDelta < 0) {
    return `Trust slipped because ${drivers[stakeholder].negative}.`;
  }
  return "Trust stayed near its starting point because your choices sent mixed or balanced signals to this stakeholder.";
}

export function getMessagePreview(body: string, length = 96): string {
  const preview = body.split(/\s+/).join(" ");
  if (preview.length <= length) {
    return preview;
  }
  return `${preview.slice(0, length - 3).trimEnd()}...`;
}

export function downloadPlaythrough(story: Story, state: SimulationState): void {
  const blob = new Blob([buildExportText(story, state)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugifyFilename(story.meta.title)}_playthrough.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isQuickFilter(value: unknown): value is QuickFilter {
  return value === "All" || value === "Unread" || value === "Resolved";
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
