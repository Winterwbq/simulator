import {
  formatDayTime,
  formatDuration,
  getDeadlineProgressMax,
  getDeadlineProgressValue,
  getDeadlineSummary,
  getTimeRemaining,
} from "../lib/simulation";

interface TimeBannerProps {
  currentMinutes: number;
}

export function TimeBanner({ currentMinutes }: TimeBannerProps) {
  const timeRemaining = getTimeRemaining(currentMinutes);
  const progressValue = getDeadlineProgressValue(currentMinutes);
  const progressMax = getDeadlineProgressMax();
  const deadline = getDeadlineSummary();

  return (
    <section className="time-panel">
      <div className="time-banner">
        <div className="time-banner-item">
          <div className="time-banner-label">Current time</div>
          <div className="time-banner-value">{formatDayTime(currentMinutes)}</div>
        </div>
        <div className="time-banner-item">
          <div className="time-banner-label">Time remaining</div>
          <div className="time-banner-value">{formatDuration(timeRemaining)}</div>
        </div>
        <div className="time-banner-item">
          <div className="time-banner-label">Deliverable</div>
          <div className="time-banner-value">{deadline.deliverable}</div>
        </div>
      </div>

      <div className="deadline-row">
        <div className="deadline-copy">
          <div className="deadline-title">{deadline.dueLabel}</div>
          <div className="deadline-note">{deadline.consequence}</div>
        </div>
        <div className="deadline-help" title="Time advances only when you choose an action.">
          Time advances only when you choose an action.
        </div>
      </div>

      <progress
        className="deadline-progress"
        max={progressMax}
        value={progressValue}
        title="Time advances only when you choose an action."
      />
    </section>
  );
}
