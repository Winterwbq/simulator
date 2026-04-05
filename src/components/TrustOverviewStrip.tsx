import { KNOWN_STAKEHOLDERS } from "../lib/types";
import { formatSignedNumber, getLastDecisionEffects, getTotalDeltas, getTrustBand } from "../lib/simulation";
import type { KnownStakeholder, SimulationState } from "../lib/types";

interface TrustOverviewStripProps {
  state: SimulationState;
}

function formatStakeholderName(value: KnownStakeholder): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function TrustOverviewStrip({ state }: TrustOverviewStripProps) {
  const totals = getTotalDeltas(state);
  const lastDeltas = getLastDecisionEffects(state);

  return (
    <section className="trust-overview-strip">
      <div className="trust-strip-header">
        <div>
          <div className="mail-pane-title">Trust Snapshot</div>
          <p className="panel-intro trust-strip-intro">
            Your overall standing across stakeholders. These values are cumulative across all handled emails.
          </p>
        </div>
      </div>

      <div className="trust-strip-grid">
        {KNOWN_STAKEHOLDERS.map((stakeholder) => {
          const value = state.trust[stakeholder];
          const totalDelta = totals[stakeholder];
          const lastDelta = lastDeltas[stakeholder];
          const [bandLabel, bandClass] = getTrustBand(value);

          return (
            <article className="trust-strip-card" key={stakeholder}>
              <div className="trust-strip-topline">
                <div className="trust-strip-name">{formatStakeholderName(stakeholder)}</div>
                <span className={`trust-band ${bandClass}`}>{bandLabel}</span>
              </div>
              <div className="trust-strip-score">{value}</div>
              <div className="trust-strip-deltas">
                <span>{`Total ${formatSignedNumber(totalDelta)}`}</span>
                <span>{`Last ${formatSignedNumber(lastDelta)}`}</span>
              </div>
              <progress max={100} value={value} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
