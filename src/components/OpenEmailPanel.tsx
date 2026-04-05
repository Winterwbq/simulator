import { buildConsequenceHint, extractAttachments, extractDecisionSummary } from "../lib/simulation";
import { PanelHeader } from "./PanelHeader";
import type { DraftGradingHealth, Message, ReplyType, SimulationState, Story } from "../lib/types";

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
          <div className="callout success">This email has already been handled.</div>
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
  const badgeText = message.choices.length > 0 ? "Action Required" : "FYI";
  const badgeClass = message.choices.length > 0 ? "mail-badge-action" : "mail-badge-fyi";

  return (
    <section>
      <PanelHeader title="Open Email" />
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

      {state.lastReplyPreview ? (
        <>
          <div className="section-divider" />
          <details className="reply-expander">
            <summary>Draft reply</summary>
            <div className="reply-editor-wrap">
              <label className="field-label" htmlFor="draft-reply">
                Edit your reply
              </label>
              <textarea
                id="draft-reply"
                className="reply-editor"
                value={state.lastReplyPreview}
                onChange={(event) => onDraftReplyChange(message.id, event.target.value)}
              />
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
}
