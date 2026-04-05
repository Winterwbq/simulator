import { KNOWN_STAKEHOLDERS } from "../lib/types";
import { formatSignedNumber, getTotalDeltas } from "../lib/simulation";
import type { SimulationState } from "../lib/types";

interface AnalysisPanelsProps {
  state: SimulationState;
  logLimit?: number;
}

export function AnalysisPanels({ state, logLimit }: AnalysisPanelsProps) {
  const totals = getTotalDeltas(state);
  const entries = typeof logLimit === "number" ? state.logEntries.slice(-logLimit) : state.logEntries;

  return (
    <>
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
                  {KNOWN_STAKEHOLDERS.map((stakeholder) => (
                    <th key={stakeholder}>{stakeholder.charAt(0).toUpperCase() + stakeholder.slice(1)}</th>
                  ))}
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {state.decisionLog.map((entry) => {
                  const netDelta = KNOWN_STAKEHOLDERS.reduce(
                    (total, stakeholder) => total + Number(entry.trust_deltas[stakeholder] ?? 0),
                    0,
                  );

                  return (
                    <tr key={entry.step_index}>
                      <td>{entry.step_index}</td>
                      <td>{entry.subject || entry.message_id}</td>
                      <td>{entry.response_label}</td>
                      {KNOWN_STAKEHOLDERS.map((stakeholder) => (
                        <td key={stakeholder}>{formatSignedNumber(Number(entry.trust_deltas[stakeholder] ?? 0))}</td>
                      ))}
                      <td>{formatSignedNumber(netDelta)}</td>
                    </tr>
                  );
                })}
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
    </>
  );
}
