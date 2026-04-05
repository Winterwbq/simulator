export const KNOWN_STAKEHOLDERS = [
  "regulator",
  "investor",
  "community",
  "engineering",
  "media",
] as const;

export type KnownStakeholder = (typeof KNOWN_STAKEHOLDERS)[number];
export type TrustScores = Record<KnownStakeholder, number>;
export type QuickFilter = "All" | "Unread" | "Resolved";
export type EndingOperator = ">=" | "<=" | ">" | "<";
export type ReplyType =
  | "Public statement"
  | "Email to regulator"
  | "Email to community"
  | "Internal update";
export type RubricDimension =
  | "Transparency"
  | "Verification"
  | "Engagement"
  | "Compliance"
  | "Tone";

export interface Choice {
  label: string;
  next: string[];
  effects: Partial<Record<KnownStakeholder, number>>;
  log: string;
}

export interface Message {
  id: string;
  from: string;
  stakeholder: string;
  subject: string;
  time: string;
  body: string;
  choices: Choice[];
  cc?: string;
  attachment?: string;
  attachments?: string[];
}

export interface Ending {
  name: string;
  condition: Partial<Record<KnownStakeholder, string>>;
  text: string;
}

export interface StoryMeta {
  title: string;
  role: string;
  setting: string;
  start_messages: string[];
  initial_trust: TrustScores;
  briefing?: {
    situation: string;
    todayJob: string;
    successCondition: string;
    moreContext: string[];
  };
}

export interface Story {
  meta: StoryMeta;
  messages: Record<string, Message>;
  endings: Ending[];
}

export interface DecisionLogEntry {
  step_index: number;
  message_id: string;
  subject: string;
  choice_label: string;
  effects: Partial<Record<KnownStakeholder, number>>;
}

export interface TrustSnapshot {
  step_index: number;
  label: string;
  trust: TrustScores;
}

export interface DraftComposerState {
  text: string;
  replyType: ReplyType;
}

export interface RubricScores {
  Transparency: number;
  Verification: number;
  Engagement: number;
  Compliance: number;
  Tone: number;
}

export interface RubricDetailDimension {
  score: number;
  positiveTriggers: string[];
  negativeTriggers: string[];
}

export interface RubricPenaltyFlags {
  overconfidentClaims: number;
  dismissiveTone: number;
  noCommentStonewalling: number;
  inconsistencyCues: number;
  transparencyImpliesDelay: number;
}

export interface RubricDetail {
  tooShort: boolean;
  warnings: string[];
  dimensions: Record<RubricDimension, RubricDetailDimension>;
  penalties: RubricPenaltyFlags;
}

export interface DraftPlayLogEntry {
  step_index: number;
  message_id: string;
  subject: string;
  drafted_reply_text: string;
  reply_type: ReplyType;
  rubric_scores: RubricScores;
  trust_deltas: Partial<Record<KnownStakeholder, number>>;
  rubric_detail: RubricDetail;
}

export interface DraftGradeResult {
  rubric_scores: RubricScores;
  trust_deltas: Partial<Record<KnownStakeholder, number>>;
  rubric_detail: RubricDetail;
}

export type DraftGradingStatus =
  | "checking"
  | "ready"
  | "warming_up"
  | "model_missing"
  | "binary_missing"
  | "server_unreachable"
  | "error";

export interface DraftGradingHealth {
  gradingBackend: string;
  llamaServerUrl: string;
  llamaModel: string;
  llamaReachable: boolean;
  modelExists: boolean;
  serverBinaryExists: boolean;
  status: DraftGradingStatus;
  statusMessage: string;
}

export interface SimulationState {
  simInitialized: boolean;
  storyTitle: string;
  availableIds: string[];
  openedIds: string[];
  handledIds: string[];
  selectedMessageId: string | null;
  trust: TrustScores;
  logEntries: string[];
  decisionLog: DecisionLogEntry[];
  playLog: DraftPlayLogEntry[];
  trustHistory: TrustSnapshot[];
  searchQuery: string;
  quickFilter: QuickFilter;
  stakeholderFilter: string;
  currentMinutes: number;
  deadlineLabel: string;
  lastTimeAdvanceNotice: string;
  lastReplyPreview: string;
  ending: Ending | null;
  simulationComplete: boolean;
  showStartPrompt: boolean;
  draftReplies: Record<string, DraftComposerState>;
  lastDraftEvaluation: DraftPlayLogEntry | null;
  draftSubmissionError: string | null;
  draftSubmissionPending: boolean;
}
