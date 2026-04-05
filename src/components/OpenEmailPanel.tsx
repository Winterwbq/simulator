import {
  buildConsequenceHint,
  extractAttachments,
  extractDecisionSummary,
  formatSignedNumber,
} from "../lib/simulation";
import { PanelHeader } from "./PanelHeader";
import type {
  DraftGradingHealth,
  Message,
  KnownStakeholder,
  ReplyEvaluationEntry,
  ReplyType,
  SimulationState,
  Story,
} from "../lib/types";
import { KNOWN_STAKEHOLDERS } from "../lib/types";

interface OpenEmailPanelProps {
  story: Story;
  state: SimulationState;
  messageId: string | null;
  onChoose: (messageId: string, choiceIndex: number) => void;
  onDraftReplyChange: (messageId: string, value: string) => void;
  onDraftReplyTypeChange: (messageId: string, value: ReplyType) => void;
  onSendDraftedReply: (messageId: string) => void;
  replyEvaluationPending: boolean;
  replyEvaluationError: string | null;
  draftGradingHealth: DraftGradingHealth;
}

const REPLY_TYPE_OPTIONS: ReplyType[] = [
  "Public statement",
  "Email to regulator",
  "Email to community",
  "Internal update",
];

function renderChoiceActions(
  message: Message,
  state: SimulationState,
  onChoose: OpenEmailPanelProps["onChoose"],
  onDraftReplyChange: OpenEmailPanelProps["onDraftReplyChange"],
  onDraftReplyTypeChange: OpenEmailPanelProps["onDraftReplyTypeChange"],
  onSendDraftedReply: OpenEmailPanelProps["onSendDraftedReply"],
  replyEvaluationPending: OpenEmailPanelProps["replyEvaluationPending"],
  replyEvaluationError: OpenEmailPanelProps["replyEvaluationError"],
  draftGradingHealth: OpenEmailPanelProps["draftGradingHealth"],
) {
  if (message.choices.length > 0) {
    const composer = state.draftReplies[message.id] ?? {
      text: "",
      replyType: "Public statement" as ReplyType,
    };

    return (
      <>
        <div className="decision-summary">{extractDecisionSummary(message)}</div>
        {state.handledIds.includes(message.id) ? (
          <div className="callout success">Reply sent. This thread has already been handled.</div>
        ) : (
          <>
            <h3 className="section-title">Next Action</h3>
            {replyEvaluationError ? (
              <div className="callout error draft-error">{replyEvaluationError}</div>
            ) : null}
            {message.choices.map((choice, index) => (
              <div className="choice-block" key={`${message.id}-choice-${index}`}>
                <button
                  className="primary-button wide-button"
                  type="button"
                  onClick={() => onChoose(message.id, index)}
                  disabled={replyEvaluationPending || draftGradingHealth.status !== "ready"}
                >
                  {choice.label}
                </button>
                <div className="choice-hint">{buildConsequenceHint()}</div>
              </div>
            ))}

            <details className="reply-expander draft-expander">
              <summary>Draft your own reply (optional)</summary>
              <div className="reply-editor-wrap">
                <div className="small-caption">{draftGradingHealth.statusMessage}</div>
                {draftGradingHealth.status !== "ready" ? (
                  <div className={`callout ${draftGradingHealth.status === "error" || draftGradingHealth.status === "model_missing" || draftGradingHealth.status === "binary_missing" ? "error" : "info"}`}>
                    {draftGradingHealth.status === "checking"
                      ? "Checking the local reply grader."
                      : draftGradingHealth.statusMessage}
                  </div>
                ) : null}
                <label className="field-label" htmlFor={`draft-reply-text-${message.id}`}>
                  Your reply
                </label>
                <textarea
                  id={`draft-reply-text-${message.id}`}
                  className="reply-editor"
                  value={composer.text}
                  onChange={(event) => onDraftReplyChange(message.id, event.target.value)}
                  placeholder="Write the reply you want to send..."
                />

                <label className="field-label" htmlFor={`draft-reply-type-${message.id}`}>
                  Reply type
                </label>
                <select
                  id={`draft-reply-type-${message.id}`}
                  className="select-input"
                  value={composer.replyType}
                  onChange={(event) => onDraftReplyTypeChange(message.id, event.target.value as ReplyType)}
                >
                  {REPLY_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <div className="draft-send-row">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => onSendDraftedReply(message.id)}
                    disabled={
                      composer.text.trim().length === 0 ||
                      replyEvaluationPending ||
                      draftGradingHealth.status !== "ready"
                    }
                  >
                    {replyEvaluationPending ? "Grading reply..." : "Send drafted reply"}
                  </button>
                </div>
              </div>
            </details>
          </>
        )}
      </>
    );
  }

  return <div className="callout info">This is an FYI message. Reading it does not change the simulation.</div>;
}

function getReplyEntryForMessage(state: SimulationState, messageId: string): ReplyEvaluationEntry | null {
  for (let index = state.decisionLog.length - 1; index >= 0; index -= 1) {
    const entry = state.decisionLog[index];
    if (entry.message_id === messageId) {
      return entry;
    }
  }

  return null;
}

function formatStakeholderName(value: KnownStakeholder): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function OpenEmailPanel({
  story,
  state,
  messageId,
  onChoose,
  onDraftReplyChange,
  onDraftReplyTypeChange,
  onSendDraftedReply,
  replyEvaluationPending,
  replyEvaluationError,
  draftGradingHealth,
}: OpenEmailPanelProps) {
  if (!messageId) {
    return (
      <section>
        <PanelHeader title="Open Email" />
        <div className="callout info">No email selected.</div>
      </section>
    );
  }

  const message = story.messages[messageId];
  const attachments = extractAttachments(message);
  const replyEntry = getReplyEntryForMessage(state, messageId);
  const replyNetImpact = replyEntry
    ? KNOWN_STAKEHOLDERS.reduce(
        (total, stakeholder) => total + Number(replyEntry.trust_deltas[stakeholder] ?? 0),
        0,
      )
    : 0;
  const isHandled = state.handledIds.includes(message.id);
  const badgeText = message.choices.length === 0 ? "FYI" : isHandled ? "Completed" : "Action Required";
  const badgeClass =
    message.choices.length === 0
      ? "mail-badge-fyi"
      : isHandled
        ? "mail-badge-completed"
        : "mail-badge-action";

  return (
    <section>
      <PanelHeader title="Conversation" />
      <div className="mail-message-card">
        <div className="mail-message-topline">
          <div className="mail-message-subject">{message.subject}</div>
          <div className={`mail-message-badge ${badgeClass}`}>{badgeText}</div>
        </div>

        <div className="mail-meta-row">{`From: ${message.from}`}</div>
        <div className="mail-meta-row">To: You (Chief of Staff)</div>
        {message.cc ? <div className="mail-meta-row">{`CC: ${message.cc}`}</div> : null}
        <div className="mail-meta-row">{`Sent: ${message.time}`}</div>
        <div className="mail-meta-row">{`Stakeholder: ${message.stakeholder}`}</div>

        {attachments.length > 0 ? (
          <>
            <div className="mail-meta-row attachments-title">Attachments</div>
            <div className="mail-attachments">
              {attachments.map((attachment) => (
                <span className="mail-attachment-chip" key={attachment}>
                  {attachment}
                </span>
              ))}
            </div>
          </>
        ) : null}

        <pre className="mail-message-body">{message.body}</pre>
      </div>

      {replyEntry ? (
        <>
          <div className="mail-message-card mail-message-card-sent">
            <div className="thread-cue">↳ Outgoing reply</div>
            <div className="mail-message-topline">
              <div className="mail-message-subject">{`Re: ${message.subject}`}</div>
              <div className="mail-message-badge mail-badge-sent">Reply sent</div>
            </div>

            <div className="mail-meta-row">From: You (Chief of Staff)</div>
            <div className="mail-meta-row">{`To: ${message.from}`}</div>
            <div className="mail-meta-row">{`Reply type: ${replyEntry.reply_type}`}</div>

            <pre className="mail-message-body">{replyEntry.reply_text}</pre>
          </div>

          <div className="reply-impact-panel">
            <div className="reply-impact-header">
              <div>
                <h3 className="section-title">Reply impact for this email</h3>
                <div className="small-caption">
                  These are the scores from this specific processed thread, not the cumulative totals.
                </div>
              </div>
              <div className="reply-impact-net">{`Net ${formatSignedNumber(replyNetImpact)}`}</div>
            </div>

            <div className="reply-impact-grid">
              {KNOWN_STAKEHOLDERS.map((stakeholder) => {
                const delta = Number(replyEntry.trust_deltas[stakeholder] ?? 0);
                const deltaClass =
                  delta > 0
                    ? "impact-value-positive"
                    : delta < 0
                      ? "impact-value-negative"
                      : "impact-value-neutral";

                return (
                  <div className="impact-card" key={stakeholder}>
                    <div className="impact-label">{formatStakeholderName(stakeholder)}</div>
                    <div className={`impact-value ${deltaClass}`}>{formatSignedNumber(delta)}</div>
                  </div>
                );
              })}
            </div>

            <div className="reply-explanations">
              <h4 className="section-title">Why these scores?</h4>
              <div className="reply-explanations-list">
                {KNOWN_STAKEHOLDERS.map((stakeholder) => (
                  <p className="impact-explanation" key={stakeholder}>
                    <strong>{`${formatStakeholderName(stakeholder)}:`}</strong>{" "}
                    {replyEntry.trust_explanations[stakeholder]}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="section-divider" />
      {renderChoiceActions(
        message,
        state,
        onChoose,
        onDraftReplyChange,
        onDraftReplyTypeChange,
        onSendDraftedReply,
        replyEvaluationPending,
        replyEvaluationError,
        draftGradingHealth,
      )}
    </section>
  );
}
