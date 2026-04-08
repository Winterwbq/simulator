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
export type GradingMode = "predefined" | "ai";
export type EndingOperator = ">=" | "<=" | ">" | "<";
export type ReplyType =
  | "Public statement"
  | "Email to regulator"
  | "Email to community"
  | "Internal update";
export type ReplySource = "preset" | "draft";
export type StakeholderDeltas = Record<KnownStakeholder, number>;
export type StakeholderExplanations = Record<KnownStakeholder, string>;

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

export interface StoryDeadline {
  dueLabel?: string;
  deliverable?: string;
  consequence?: string;
}

export interface StoryMeta {
  id: string;
  title: string;
  role: string;
  setting: string;
  start_messages: string[];
  initial_trust: TrustScores;
  deadline?: StoryDeadline;
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

export interface TrustSnapshot {
  step_index: number;
  label: string;
  trust: TrustScores;
}

export interface DraftComposerState {
  text: string;
  replyType: ReplyType;
}

export interface DraftGradeResult {
  trust_deltas: StakeholderDeltas;
  trust_explanations: StakeholderExplanations;
}

export interface ReplyEvaluationEntry extends DraftGradeResult {
  step_index: number;
  message_id: string;
  subject: string;
  reply_source: ReplySource;
  response_label: string;
  reply_text: string;
  reply_type: ReplyType;
}

export type DecisionLogEntry = ReplyEvaluationEntry;

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
  scenarioId: string;
  storyTitle: string;
  availableIds: string[];
  openedIds: string[];
  handledIds: string[];
  selectedMessageId: string | null;
  trust: TrustScores;
  logEntries: string[];
  decisionLog: DecisionLogEntry[];
  trustHistory: TrustSnapshot[];
  searchQuery: string;
  quickFilter: QuickFilter;
  stakeholderFilter: string;
  currentMinutes: number;
  deadlineLabel: string;
  lastTimeAdvanceNotice: string;
  ending: Ending | null;
  simulationComplete: boolean;
  showStartPrompt: boolean;
  draftReplies: Record<string, DraftComposerState>;
  replyEvaluationError: string | null;
  replyEvaluationPending: boolean;
}
