import { KNOWN_STAKEHOLDERS } from "../lib/types";
import { formatSignedNumber } from "../lib/simulation";
import type { SimulationState } from "../lib/types";

interface AnalysisPanelsProps {
  state: SimulationState;
  logLimit?: number;
}

export function AnalysisPanels({ state, logLimit }: AnalysisPanelsProps) {
  const entries = typeof logLimit === "number" ? state.logEntries.slice(-logLimit) : state.logEntries;

  return (
    <>
      <details className="records-section">
        <summary>System log</summary>
        <div className="records-section-body">
          <pre className="system-log">
            {entries.map((entry, index) => `${index + 1}. ${entry}`).join("\n")}
          </pre>
        </div>
      </details>

      <div className="section-divider" />
      <h3 className="section-title">Decision Ledger</h3>
      {state.decisionLog.length === 0 ? (
        <div className="callout info">No decisions yet. Trust changes will appear here after you choose a response.</div>
      ) : (
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
      )}
    </>
  );
}
