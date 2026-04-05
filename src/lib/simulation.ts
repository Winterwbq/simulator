import {
  DEADLINE_CONSEQUENCE,
  DEADLINE_DELIVERABLE,
  DEADLINE_LABEL,
  DEADLINE_MINUTES,
  DECISION_SUMMARIES,
  DECISION_TIME_INCREMENT,
  DEFAULT_TIME_MINUTES,
  ENDING_PATTERN,
  STORAGE_KEY,
} from "./constants";
import { KNOWN_STAKEHOLDERS } from "./types";
import type {
  Choice,
  DraftComposerState,
  DraftGradeResult,
  Ending,
  KnownStakeholder,
  Message,
  QuickFilter,
  ReplyEvaluationEntry,
  ReplyType,
  SimulationState,
  StakeholderDeltas,
  StakeholderExplanations,
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
    trustHistory: [{ step_index: 0, label: "Start", trust: { ...initialTrust } }],
    searchQuery: "",
    quickFilter: "All",
    stakeholderFilter: "All",
    currentMinutes: DEFAULT_TIME_MINUTES,
    deadlineLabel: DEADLINE_LABEL,
    lastTimeAdvanceNotice: "",
    ending: null,
    simulationComplete: false,
    showStartPrompt: true,
    draftReplies: {},
    replyEvaluationError: null,
    replyEvaluationPending: false,
  };
}

function isTrustScores(value: unknown): value is TrustScores {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return KNOWN_STAKEHOLDERS.every((stakeholder) => typeof (value as TrustScores)[stakeholder] === "number");
}

function isStakeholderDeltas(value: unknown): value is StakeholderDeltas {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return KNOWN_STAKEHOLDERS.every(
    (stakeholder) => typeof (value as StakeholderDeltas)[stakeholder] === "number",
  );
}

function isStakeholderExplanations(value: unknown): value is StakeholderExplanations {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return KNOWN_STAKEHOLDERS.every(
    (stakeholder) => typeof (value as StakeholderExplanations)[stakeholder] === "string",
  );
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

function buildFallbackExplanation(stakeholder: KnownStakeholder, delta: number): string {
  const label = `${stakeholder.charAt(0).toUpperCase()}${stakeholder.slice(1)}`;

  if (delta > 0) {
    return `This reply had a positive effect on ${label.toLowerCase()} trust.`;
  }
  if (delta < 0) {
    return `This reply had a negative effect on ${label.toLowerCase()} trust.`;
  }
  return `This reply had little direct effect on ${label.toLowerCase()} trust.`;
}

function normalizeStakeholderExplanations(
  value: unknown,
  deltas: StakeholderDeltas,
): StakeholderExplanations {
  if (isStakeholderExplanations(value)) {
    return value;
  }

  return KNOWN_STAKEHOLDERS.reduce((accumulator, stakeholder) => {
    accumulator[stakeholder] = buildFallbackExplanation(stakeholder, deltas[stakeholder]);
    return accumulator;
  }, {} as StakeholderExplanations);
}

function coerceReplyEvaluationEntry(value: unknown): ReplyEvaluationEntry | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const entry = value as Partial<ReplyEvaluationEntry>;
  if (
    typeof entry.step_index !== "number" ||
    typeof entry.message_id !== "string" ||
    typeof entry.subject !== "string" ||
    typeof entry.reply_source !== "string" ||
    typeof entry.response_label !== "string" ||
    typeof entry.reply_text !== "string" ||
    typeof entry.reply_type !== "string" ||
    !isStakeholderDeltas(entry.trust_deltas)
  ) {
    return null;
  }

  return {
    step_index: entry.step_index,
    message_id: entry.message_id,
    subject: entry.subject,
    reply_source: entry.reply_source,
    response_label: entry.response_label,
    reply_text: entry.reply_text,
    reply_type: entry.reply_type,
    trust_deltas: entry.trust_deltas,
    trust_explanations: normalizeStakeholderExplanations(entry.trust_explanations, entry.trust_deltas),
  };
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
    const parsed = JSON.parse(raw) as Partial<SimulationState> & {
      draftSubmissionError?: string | null;
      draftSubmissionPending?: boolean;
    };
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
      decisionLog: Array.isArray(parsed.decisionLog)
        ? parsed.decisionLog
            .map((entry) => coerceReplyEvaluationEntry(entry))
            .filter((entry): entry is ReplyEvaluationEntry => entry !== null)
        : fallback.decisionLog,
      trustHistory: Array.isArray(parsed.trustHistory) ? parsed.trustHistory : fallback.trustHistory,
      logEntries: Array.isArray(parsed.logEntries) ? parsed.logEntries : fallback.logEntries,
      quickFilter: isQuickFilter(parsed.quickFilter) ? parsed.quickFilter : fallback.quickFilter,
      showStartPrompt:
        typeof parsed.showStartPrompt === "boolean" ? parsed.showStartPrompt : false,
      draftReplies: isDraftComposerMap(parsed.draftReplies) ? parsed.draftReplies : fallback.draftReplies,
      replyEvaluationError:
        typeof parsed.replyEvaluationError === "string"
          ? parsed.replyEvaluationError
          : typeof parsed.draftSubmissionError === "string"
            ? parsed.draftSubmissionError
            : fallback.replyEvaluationError,
      replyEvaluationPending: false,
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
  gradedResult: DraftGradeResult,
): SimulationState {
  if (state.handledIds.includes(messageId)) {
    return state;
  }

  const message = story.messages[messageId];
  const choice = message.choices[choiceIndex];
  return applyEvaluatedReply(story, state, {
    messageId,
    subject: message.subject || messageId,
    replySource: "preset",
    responseLabel: choice.label,
    replyText: buildPresetReplyText(message, choice),
    replyType: inferReplyTypeForMessage(message),
    trustDeltas: gradedResult.trust_deltas,
    trustExplanations: gradedResult.trust_explanations,
    unlockedCandidateIds: choice.next,
    logLine: choice.log.trim()
      ? `You chose the preset reply: ${choice.log.trim()}.`
      : `You chose the preset reply "${choice.label}".`,
  });
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
  gradedResult: DraftGradeResult,
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
  const nextState = applyEvaluatedReply(story, state, {
    messageId,
    subject: message.subject || messageId,
    replySource: "draft",
    responseLabel: `Drafted reply (${composer.replyType})`,
    replyText: draftedReplyText,
    replyType: composer.replyType,
    trustDeltas: gradedResult.trust_deltas,
    trustExplanations: gradedResult.trust_explanations,
    unlockedCandidateIds: getDraftUnlockIds(story, message),
    logLine: `You drafted a ${composer.replyType.toLowerCase()} for "${message.subject}".`,
  });

  const nextDraftReplies = { ...nextState.draftReplies };
  delete nextDraftReplies[messageId];

  return {
    ...nextState,
    draftReplies: nextDraftReplies,
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

  const lastEffects = state.decisionLog[state.decisionLog.length - 1].trust_deltas;
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

export function buildConsequenceHint(): string {
  return "Graded by the same local model after you choose it.";
}

export function buildPresetReplyText(message: Message, choice: Choice): string {
  const actionLine = choice.log.trim() || choice.label;
  return [
    "Thank you for raising this.",
    `In response to "${message.subject}", we will ${actionLine}.`,
    "We will continue sharing updates as the next review steps move forward.",
  ].join("\n\n");
}

export function inferReplyTypeForMessage(message: Message): ReplyType {
  if (message.stakeholder === "regulator") {
    return "Email to regulator";
  }
  if (message.stakeholder === "community") {
    return "Email to community";
  }
  if (message.stakeholder === "engineering" || message.stakeholder === "internal") {
    return "Internal update";
  }
  return "Public statement";
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

export function formatSignedNumber(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function getTotalDeltas(state: SimulationState): Record<KnownStakeholder, number> {
  const totals = KNOWN_STAKEHOLDERS.reduce((accumulator, stakeholder) => {
    accumulator[stakeholder] = 0;
    return accumulator;
  }, {} as Record<KnownStakeholder, number>);

  for (const entry of state.decisionLog) {
    for (const [stakeholder, delta] of Object.entries(entry.trust_deltas)) {
      totals[stakeholder as KnownStakeholder] += Number(delta);
    }
  }

  return totals;
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

function applyEvaluatedReply(
  story: Story,
  state: SimulationState,
  input: {
    messageId: string;
    subject: string;
    replySource: "preset" | "draft";
    responseLabel: string;
    replyText: string;
    replyType: ReplyType;
    trustDeltas: StakeholderDeltas;
    trustExplanations: StakeholderExplanations;
    unlockedCandidateIds: string[];
    logLine: string;
  },
): SimulationState {
  const stepIndex = state.decisionLog.length + 1;
  const openedIds = state.openedIds.includes(input.messageId)
    ? state.openedIds
    : [...state.openedIds, input.messageId];
  const handledIds = [...state.handledIds, input.messageId];
  const availableIds = [...state.availableIds];
  const unlockedNow: string[] = [];

  for (const nextId of input.unlockedCandidateIds) {
    if (!availableIds.includes(nextId) && nextId in story.messages) {
      availableIds.push(nextId);
      unlockedNow.push(nextId);
    }
  }

  const trust = { ...state.trust };
  for (const stakeholder of KNOWN_STAKEHOLDERS) {
    trust[stakeholder] = clampTrust(trust[stakeholder] + Number(input.trustDeltas[stakeholder] ?? 0));
  }

  const evaluationEntry: ReplyEvaluationEntry = {
    step_index: stepIndex,
    message_id: input.messageId,
    subject: input.subject,
    reply_source: input.replySource,
    response_label: input.responseLabel,
    reply_text: input.replyText,
    reply_type: input.replyType,
    trust_deltas: { ...input.trustDeltas },
    trust_explanations: { ...input.trustExplanations },
  };

  const trustHistory = [
    ...state.trustHistory,
    {
      step_index: stepIndex,
      label: input.subject,
      trust: { ...trust },
    },
  ];
  const logEntries = [...state.logEntries, input.logLine];
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
    decisionLog: [...state.decisionLog, evaluationEntry],
    trustHistory,
    logEntries,
    currentMinutes,
    lastTimeAdvanceNotice: `Time advanced to ${formatDayTime(currentMinutes)}.`,
    ending,
    simulationComplete: ending ? false : allActionableMessagesHandled(story, availableIds, handledIds),
    selectedMessageId: input.messageId,
    replyEvaluationError: null,
    replyEvaluationPending: false,
  };

  return nextBaseState;
}
