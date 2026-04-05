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
      <div className="briefing-header">Briefing</div>
      <p className="briefing-kicker">
        A short orientation for the decision round ahead.
      </p>
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
            <strong>Start here.</strong> Read the situation once, then work through the inbox in the order that feels most urgent.
          </div>
          <div className="action-row">
            <button className="primary-button" type="button" onClick={onStartSimulation}>
              Begin briefing round
            </button>
            <button className="secondary-button" type="button" onClick={onDismissStartPrompt}>
              Skip intro
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
