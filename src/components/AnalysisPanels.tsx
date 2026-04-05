import { KNOWN_STAKEHOLDERS } from "../lib/types";
import { explainStakeholderOutcome, formatEffects, getTotalDeltas } from "../lib/simulation";
import type { SimulationState } from "../lib/types";

interface AnalysisPanelsProps {
  state: SimulationState;
  logLimit?: number;
}

export function AnalysisPanels({ state, logLimit }: AnalysisPanelsProps) {
  const totals = getTotalDeltas(state);
  const entries = typeof logLimit === "number" ? state.logEntries.slice(-logLimit) : state.logEntries;
  const lastDraftEvaluation = state.lastDraftEvaluation;

  return (
    <>
      {lastDraftEvaluation ? (
        <>
          <div className="section-divider" />
          <h3 className="section-title">Last Drafted Reply Evaluation</h3>
          <div className="small-caption">{`${lastDraftEvaluation.reply_type} for "${lastDraftEvaluation.subject}"`}</div>

          {lastDraftEvaluation.rubric_detail.warnings.length > 0 ? (
            <div className="callout info">
              {lastDraftEvaluation.rubric_detail.warnings.join(" ")}
            </div>
          ) : null}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rubric dimension</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(lastDraftEvaluation.rubric_scores).map(([dimension, score]) => (
                  <tr key={dimension}>
                    <td>{dimension}</td>
                    <td>{score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section-divider" />
          <h4 className="section-title">Why trust changed</h4>
          <div className="outcome-list">
            {Object.entries(lastDraftEvaluation.rubric_detail.dimensions).map(([dimension, detail]) => (
              <p key={dimension}>
                <strong>{dimension}</strong>
                {`: score ${detail.score}. `}
                {detail.positiveTriggers.length > 0
                  ? `Positive triggers: ${detail.positiveTriggers.join(", ")}. `
                  : "No positive triggers found. "}
                {detail.negativeTriggers.length > 0
                  ? `Negative triggers: ${detail.negativeTriggers.join(", ")}.`
                  : "No negative triggers found."}
              </p>
            ))}
          </div>

          <div className="section-divider" />
          <h4 className="section-title">Trust delta summary</h4>
          <div className="callout neutral">{formatEffects(lastDraftEvaluation.trust_deltas)}</div>
        </>
      ) : null}

      <div className="section-divider" />
      <h3 className="section-title">System Log</h3>
      <pre className="system-log">
        {entries.map((entry, index) => `${index + 1}. ${entry}`).join("\n")}
      </pre>

      <div className="section-divider" />
      <h3 className="section-title">What Changed Trust?</h3>
      {state.decisionLog.length === 0 ? (
        <div className="callout info">No decisions yet. Trust changes will appear here after you choose a response.</div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Step #</th>
                  <th>Email subject</th>
                  <th>Choice label</th>
                  <th>Effects</th>
                </tr>
              </thead>
              <tbody>
                {state.decisionLog.map((entry) => (
                  <tr key={entry.step_index}>
                    <td>{entry.step_index}</td>
                    <td>{entry.subject || entry.message_id}</td>
                    <td>{entry.choice_label}</td>
                    <td>{formatEffects(entry.effects)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="small-caption">Totals by stakeholder</div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Stakeholder</th>
                  <th>Total delta</th>
                  <th>Final score</th>
                </tr>
              </thead>
              <tbody>
                {KNOWN_STAKEHOLDERS.map((stakeholder) => (
                  <tr key={stakeholder}>
                    <td>{stakeholder.charAt(0).toUpperCase() + stakeholder.slice(1)}</td>
                    <td>{totals[stakeholder] >= 0 ? `+${totals[stakeholder]}` : totals[stakeholder]}</td>
                    <td>{state.trust[stakeholder]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="section-divider" />
      <h3 className="section-title">Why This Outcome?</h3>
      <div className="outcome-list">
        {KNOWN_STAKEHOLDERS.map((stakeholder) => (
          <p key={stakeholder}>
            <strong>{stakeholder.charAt(0).toUpperCase() + stakeholder.slice(1)}</strong>
            {`: ${explainStakeholderOutcome(stakeholder, totals[stakeholder])}`}
          </p>
        ))}
      </div>
    </>
  );
}
