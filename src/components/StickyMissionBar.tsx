import { KNOWN_STAKEHOLDERS } from "../lib/types";
import {
  formatDayTime,
  formatDuration,
  getDeadlineProgressMax,
  getDeadlineProgressValue,
  getTimeRemaining,
} from "../lib/simulation";
import type { KnownStakeholder, SimulationState } from "../lib/types";

interface StickyMissionBarProps {
  state: SimulationState;
  visible: boolean;
}

const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function getStakeholderLabel(value: KnownStakeholder): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function getScoreDirection(value: number) {
  if (value > 50) {
    return {
      symbol: "↑",
      className: "sticky-score-trend sticky-score-trend-up",
      label: "above baseline",
    };
  }

  if (value < 50) {
    return {
      symbol: "↓",
      className: "sticky-score-trend sticky-score-trend-down",
      label: "below baseline",
    };
  }

  return {
    symbol: "→",
    className: "sticky-score-trend sticky-score-trend-flat",
    label: "at baseline",
  };
}

export function StickyMissionBar({ state, visible }: StickyMissionBarProps) {
  const timeRemaining = getTimeRemaining(state.currentMinutes);
  const progressRatio = getDeadlineProgressValue(state.currentMinutes) / getDeadlineProgressMax();
  const ringOffset = RING_CIRCUMFERENCE * (1 - progressRatio);

  return (
    <div
      className={visible ? "sticky-mission-bar sticky-mission-bar-visible" : "sticky-mission-bar"}
      aria-hidden={!visible}
    >
      <div className="sticky-mission-inner">
        <div className="sticky-mission-shell">
          <div className="sticky-mission-side">
            <div className="deadline-ring" aria-hidden="true">
              <svg viewBox="0 0 52 52" className="deadline-ring-svg">
                <circle className="deadline-ring-track" cx="26" cy="26" r={RING_RADIUS} />
                <circle
                  className="deadline-ring-progress"
                  cx="26"
                  cy="26"
                  r={RING_RADIUS}
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              <div className="deadline-ring-center">{Math.round(progressRatio * 100)}%</div>
            </div>

            <div className="sticky-mission-copy">
              <div className="sticky-mission-label">Time remaining</div>
              <div className="sticky-mission-value">{formatDuration(timeRemaining)}</div>
            </div>
          </div>

          <div className="sticky-score-strip" aria-label="Current cumulative trust scores">
            {KNOWN_STAKEHOLDERS.map((stakeholder) => {
              const score = state.trust[stakeholder];
              const direction = getScoreDirection(score);

              return (
                <div className="sticky-score-pill" key={stakeholder}>
                  <span className="sticky-score-name">{getStakeholderLabel(stakeholder)}</span>
                  <div className="sticky-score-reading">
                    <span className={direction.className} aria-label={direction.label} title={direction.label}>
                      {direction.symbol}
                    </span>
                    <strong className="sticky-score-value">{score}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sticky-mission-side sticky-mission-side-end">
            <div className="sticky-mission-copy">
              <div className="sticky-mission-label">Current time</div>
              <div className="sticky-mission-value">{formatDayTime(state.currentMinutes)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
