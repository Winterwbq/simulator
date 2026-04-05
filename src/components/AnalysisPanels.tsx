import { KNOWN_STAKEHOLDERS } from "../lib/types";
import { formatEffects, getTotalDeltas, summarizeStakeholderOutcome } from "../lib/simulation";
import type { SimulationState } from "../lib/types";

interface AnalysisPanelsProps {
  state: SimulationState;
  logLimit?: number;
}

export function AnalysisPanels({ state, logLimit }: AnalysisPanelsProps) {
  const totals = getTotalDeltas(state);
  const entries = typeof logLimit === "number" ? state.logEntries.slice(-logLimit) : state.logEntries;
  const lastEvaluation = state.lastEvaluation;

  return (
    <>
      {lastEvaluation ? (
        <>
          <div className="section-divider" />
          <h3 className="section-title">Last Reply Impact</h3>
          <div className="small-caption">
            {`${lastEvaluation.response_label} • ${lastEvaluation.reply_type} for "${lastEvaluation.subject}"`}
          </div>

          <div className="section-divider" />
          <h4 className="section-title">Trust delta summary</h4>
          <div className="callout neutral">{formatEffects(lastEvaluation.trust_deltas)}</div>
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
                    <td>{entry.response_label}</td>
                    <td>{formatEffects(entry.trust_deltas)}</td>
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
            {`: ${summarizeStakeholderOutcome(state, stakeholder)}`}
          </p>
        ))}
      </div>
    </>
  );
}
