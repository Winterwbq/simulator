import type { Story } from "../lib/types";

interface BriefingPanelProps {
  story: Story;
  showStartPrompt: boolean;
  onStartSimulation: () => void;
  onDismissStartPrompt: () => void;
}

export function BriefingPanel({
  story,
  showStartPrompt,
  onStartSimulation,
  onDismissStartPrompt,
}: BriefingPanelProps) {
  const briefing = story.meta.briefing;
  const situation = briefing?.situation ?? story.meta.setting;
  const todayJob =
    briefing?.todayJob ??
    "Review the unlocked emails, choose responses, and manage stakeholder trust under deadline.";
  const successCondition =
    briefing?.successCondition ??
    "Balance stakeholder trust strongly enough to reach a credible outcome before the deadline.";
  const moreContext = briefing?.moreContext ?? [];

  const renderContextItem = (item: string) => {
    const separatorIndex = item.indexOf(":");
    if (separatorIndex === -1) {
      return item;
    }

    const label = item.slice(0, separatorIndex).trim();
    const content = item.slice(separatorIndex + 1).trim();

    return (
      <>
        <strong>{`${label}:`}</strong> {content}
      </>
    );
  };

  return (
    <section className="briefing-card">
      <div className="briefing-header">Briefing (30 seconds)</div>
      <div className="briefing-line">
        <strong>Role:</strong> {story.meta.role}
      </div>
      <div className="briefing-line">
        <strong>Situation:</strong> {situation}
      </div>
      <div className="briefing-line">
        <strong>Your job today:</strong> {todayJob}
      </div>
      <div className="briefing-line">
        <strong>Success condition:</strong> {successCondition}
      </div>

      {moreContext.length > 0 ? (
        <details className="context-expander">
          <summary>More context</summary>
          <ul className="context-list">
            {moreContext.map((item) => (
              <li key={item}>{renderContextItem(item)}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {showStartPrompt ? (
        <div className="callout neutral start-callout">
          <div>
            <strong>Start here.</strong> Read the briefing, then begin with the unlocked emails in the inbox.
          </div>
          <div className="action-row">
            <button className="primary-button" type="button" onClick={onStartSimulation}>
              Start simulation
            </button>
            <button className="secondary-button" type="button" onClick={onDismissStartPrompt}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
