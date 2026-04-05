import { useMemo } from "react";
import { KNOWN_STAKEHOLDERS } from "../lib/types";
import { formatDeltaText, getLastDecisionEffects, getTotalDeltas, getTrustBand } from "../lib/simulation";
import type { SimulationState } from "../lib/types";

interface TrustDashboardProps {
  state: SimulationState;
}

export function TrustDashboard({ state }: TrustDashboardProps) {
  const totalDeltas = useMemo(() => getTotalDeltas(state), [state]);
  const lastDeltas = useMemo(() => getLastDecisionEffects(state), [state]);

  return (
    <details className="trust-expander">
      <summary>Stakeholder trust monitor</summary>
      <div className="trust-expander-body">
        {KNOWN_STAKEHOLDERS.map((stakeholder) => {
          const value = state.trust[stakeholder];
          const [bandLabel, bandClass, helpText] = getTrustBand(value);
          const deltaText = `${stakeholder[0].toUpperCase()}${stakeholder.slice(1)} · ${value}`;

          return (
            <div className="trust-row" key={stakeholder}>
              <div className="trust-row-header">
                <span className="trust-stakeholder">{deltaText}</span>
                <span className={`trust-band ${bandClass}`} title={helpText}>
                  {bandLabel}
                </span>
              </div>
              <div className="trust-help">
                {`${helpText} ${formatDeltaText(totalDeltas[stakeholder])} overall, ${formatDeltaText(
                  lastDeltas[stakeholder],
                )} on the last step.`}
              </div>
              <progress max={100} value={value} />
            </div>
          );
        })}
      </div>
    </details>
  );
}
