import { useEffect, useMemo, useRef, useState } from "react";
import { getRandomScenario, getScenarioById } from "./data/scenarios";
import { AnalysisPanels } from "./components/AnalysisPanels";
import { BriefingPanel } from "./components/BriefingPanel";
import { InboxPanel } from "./components/InboxPanel";
import { OpenEmailPanel } from "./components/OpenEmailPanel";
import { PanelHeader } from "./components/PanelHeader";
import { StickyMissionBar } from "./components/StickyMissionBar";
import { TimeBanner } from "./components/TimeBanner";
import { TrustDashboard } from "./components/TrustDashboard";
import { TrustOverviewStrip } from "./components/TrustOverviewStrip";
import { fetchDraftGradingHealth, gradeReplyWithApi } from "./lib/api";
import { getFilteredMessageIds, loadPersistedScenarioId, loadSimulationState, markMessageOpened, persistSimulationState, resetPersistedSimulationState, downloadPlaythrough, initializeSimulation, applyChoice, applyDraftedReply, buildPresetReplyText, inferReplyTypeForMessage, updateDraftReply } from "./lib/simulation";
import { validateStory } from "./lib/storyValidation";
import type { DraftGradingHealth, SimulationState, Story } from "./lib/types";

const DEFAULT_DRAFT_GRADING_HEALTH: DraftGradingHealth = {
  gradingBackend: "llama.cpp",
  llamaServerUrl: "http://127.0.0.1:8081",
  llamaModel: "local-grader",
  llamaReachable: false,
  modelExists: false,
  serverBinaryExists: false,
  status: "checking",
  statusMessage: "Checking the local llama.cpp reply grader...",
};

export default function App() {
  const initialStory = useMemo<Story>(() => {
    return getScenarioById(loadPersistedScenarioId()) ?? getRandomScenario();
  }, []);
  const [activeStory, setActiveStory] = useState<Story>(initialStory);
  const validationErrors = useMemo(() => validateStory(activeStory), [activeStory]);
  const [state, setState] = useState<SimulationState>(() => loadSimulationState(initialStory));
  const [draftGradingHealth, setDraftGradingHealth] = useState<DraftGradingHealth>(
    DEFAULT_DRAFT_GRADING_HEALTH,
  );
  const trustSnapshotRef = useRef<HTMLDivElement | null>(null);
  const [showStickyMissionBar, setShowStickyMissionBar] = useState(false);

  const filteredIds = useMemo(() => getFilteredMessageIds(activeStory, state), [activeStory, state]);
  const inOutcomeMode = Boolean(state.ending) || state.simulationComplete;

  useEffect(() => {
    if (validationErrors.length === 0) {
      persistSimulationState(state);
    }
  }, [state, validationErrors]);

  useEffect(() => {
    if (state.showStartPrompt) {
      return;
    }
    if (!state.selectedMessageId || state.openedIds.includes(state.selectedMessageId)) {
      return;
    }
    setState((current) => markMessageOpened(current, current.selectedMessageId!));
  }, [state.selectedMessageId, state.openedIds, state.showStartPrompt]);

  useEffect(() => {
    if (state.selectedMessageId) {
      return;
    }
    if (filteredIds.length === 0) {
      return;
    }
    setState((current) => ({ ...current, selectedMessageId: filteredIds[0] }));
  }, [filteredIds, state.selectedMessageId]);

  useEffect(() => {
    const stakeholders = ["All", ...Array.from(new Set(state.availableIds.map((messageId) => activeStory.messages[messageId].stakeholder)))];
    if (stakeholders.includes(state.stakeholderFilter)) {
      return;
    }
    setState((current) => ({ ...current, stakeholderFilter: "All" }));
  }, [activeStory, state.availableIds, state.stakeholderFilter]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const pollHealth = async () => {
      try {
        const nextHealth = await fetchDraftGradingHealth();
        if (cancelled) {
          return;
        }

        setDraftGradingHealth(nextHealth);
        const delay = nextHealth.status === "ready" ? 30000 : 5000;
        timeoutId = window.setTimeout(() => {
          void pollHealth();
        }, delay);
      } catch {
        if (cancelled) {
          return;
        }

        setDraftGradingHealth({
          ...DEFAULT_DRAFT_GRADING_HEALTH,
          status: "error",
          statusMessage: "The local grading server is unavailable. Start `npm run dev` again to restart the local stack.",
        });
        timeoutId = window.setTimeout(() => {
          void pollHealth();
        }, 5000);
      }
    };

    void pollHealth();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    if (state.showStartPrompt || inOutcomeMode) {
      setShowStickyMissionBar(false);
      return;
    }

    const updateStickyMissionBar = () => {
      const trustSnapshot = trustSnapshotRef.current;
      if (!trustSnapshot) {
        setShowStickyMissionBar(false);
        return;
      }

      const { bottom } = trustSnapshot.getBoundingClientRect();
      setShowStickyMissionBar(bottom <= 72);
    };

    updateStickyMissionBar();

    window.addEventListener("scroll", updateStickyMissionBar, { passive: true });
    window.addEventListener("resize", updateStickyMissionBar);

    return () => {
      window.removeEventListener("scroll", updateStickyMissionBar);
      window.removeEventListener("resize", updateStickyMissionBar);
    };
  }, [inOutcomeMode, state.showStartPrompt]);

  if (validationErrors.length > 0) {
    return (
      <main className="app-shell">
        <div className="page-header">
          <h1>Inbox Simulator</h1>
        </div>
        <div className="callout error">
          <strong>The simulator could not load `story.json`.</strong>
          <ul className="error-list">
            {validationErrors.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  const handleRestart = () => {
    const nextStory = getRandomScenario(activeStory.meta.id);
    resetPersistedSimulationState();
    setActiveStory(nextStory);
    setState(initializeSimulation(nextStory));
  };

  const handleChoose = async (messageId: string, choiceIndex: number) => {
    const message = activeStory.messages[messageId];
    const choice = message?.choices[choiceIndex];
    if (!message || !choice) {
      return;
    }

    if (draftGradingHealth.status !== "ready") {
      setState((current) => ({
        ...current,
        replyEvaluationPending: false,
        replyEvaluationError: draftGradingHealth.statusMessage,
      }));
      return;
    }

    setState((current) => ({
      ...current,
      replyEvaluationPending: true,
      replyEvaluationError: null,
    }));

    try {
      const graded = await gradeReplyWithApi({
        replyText: buildPresetReplyText(message, choice),
        replyType: inferReplyTypeForMessage(message),
        message,
        source: "preset",
        responseLabel: choice.label,
      });

      setState((current) => applyChoice(activeStory, current, messageId, choiceIndex, graded));
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "Reply grading request failed.";
      setState((current) => ({
        ...current,
        replyEvaluationPending: false,
        replyEvaluationError: messageText,
      }));
    }
  };

  const handleSendDraftedReply = async (messageId: string) => {
    const draft = state.draftReplies[messageId];
    const message = activeStory.messages[messageId];
    if (!draft || !message || draft.text.trim().length === 0) {
      return;
    }

    if (draftGradingHealth.status !== "ready") {
      setState((current) => ({
        ...current,
        replyEvaluationPending: false,
        replyEvaluationError: draftGradingHealth.statusMessage,
      }));
      return;
    }

    setState((current) => ({
      ...current,
      replyEvaluationPending: true,
      replyEvaluationError: null,
    }));

    try {
      const graded = await gradeReplyWithApi({
        replyText: draft.text,
        replyType: draft.replyType,
        message,
        source: "draft",
        responseLabel: `Drafted reply (${draft.replyType})`,
      });

      setState((current) => applyDraftedReply(activeStory, current, messageId, graded));
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "The local reply grading request failed.";
      setState((current) => ({
        ...current,
        replyEvaluationPending: false,
        replyEvaluationError: messageText,
      }));
    }
  };

  const pageTitle = state.ending
    ? `Ending: ${state.ending.name}`
    : inOutcomeMode
      ? "Simulation Complete"
      : activeStory.meta.title;

  return (
    <main className={showStickyMissionBar ? "app-shell app-shell-mission-bar-active" : "app-shell"}>
      {!state.showStartPrompt && !inOutcomeMode ? (
        <StickyMissionBar state={state} visible={showStickyMissionBar} />
      ) : null}

      <div className="page-header">
        <div className="page-eyebrow">Policy communication simulator</div>
        <h1>{pageTitle}</h1>
        {!inOutcomeMode ? (
          <p>
            Weigh disclosure, credibility, and public trust under deadline pressure.
          </p>
        ) : null}
      </div>

      {inOutcomeMode ? (
        <section className="outcome-screen">
          <div className="callout neutral">
            {state.ending ? (
              <p>{state.ending.text}</p>
            ) : (
              <p>You reached the end of the available decisions without triggering a defined ending.</p>
            )}
          </div>

          <div className="section-divider" />
          <h2 className="section-title">Final Trust Summary</h2>
          <TrustDashboard state={state} />

          <AnalysisPanels state={state} />

          <div className="section-divider" />
          <h3 className="section-title">Playthrough Log</h3>
          <pre className="system-log">{state.logEntries.map((entry, index) => `${index + 1}. ${entry}`).join("\n")}</pre>

          <div className="action-row">
            <button className="primary-button" type="button" onClick={() => downloadPlaythrough(activeStory, state)}>
              Export playthrough log
            </button>
            <button className="secondary-button" type="button" onClick={handleRestart}>
              Restart simulation
            </button>
          </div>
        </section>
      ) : (
        <>
          <BriefingPanel
            story={activeStory}
            showStartPrompt={state.showStartPrompt}
            onStartSimulation={() => setState((current) => ({ ...current, showStartPrompt: false }))}
            onDismissStartPrompt={() => setState((current) => ({ ...current, showStartPrompt: false }))}
          />
          <TimeBanner story={activeStory} currentMinutes={state.currentMinutes} />
          {!state.showStartPrompt ? (
            <>
              {state.lastTimeAdvanceNotice ? <div className="callout info">{state.lastTimeAdvanceNotice}</div> : null}
              <p className="intro-copy">
                Work email-by-email in the main thread, keep an eye on the cumulative trust ribbon above, and open the records dock only when you need deeper history.
              </p>

              <div ref={trustSnapshotRef}>
                <TrustOverviewStrip state={state} />
              </div>

              <div className="workspace-layout">
                <aside className="workspace-rail">
                  <InboxPanel
                    story={activeStory}
                    state={state}
                    filteredIds={filteredIds}
                    onSearchChange={(value) => setState((current) => ({ ...current, searchQuery: value }))}
                    onQuickFilterChange={(value) => setState((current) => ({ ...current, quickFilter: value }))}
                    onStakeholderFilterChange={(value) => setState((current) => ({ ...current, stakeholderFilter: value }))}
                    onSelectMessage={(messageId) =>
                      setState((current) => {
                        const nextState = { ...current, selectedMessageId: messageId };
                        return markMessageOpened(nextState, messageId);
                      })
                    }
                  />
                </aside>

                <section className="workspace-main">
                  <OpenEmailPanel
                    story={activeStory}
                    state={state}
                    messageId={state.selectedMessageId}
                    onChoose={handleChoose}
                    onDraftReplyChange={(messageId, value) =>
                      setState((current) =>
                        updateDraftReply(current, messageId, { text: value }),
                      )
                    }
                    onDraftReplyTypeChange={(messageId, value) =>
                      setState((current) =>
                        updateDraftReply(current, messageId, { replyType: value }),
                      )
                    }
                    onSendDraftedReply={handleSendDraftedReply}
                    replyEvaluationPending={state.replyEvaluationPending}
                    replyEvaluationError={state.replyEvaluationError}
                    draftGradingHealth={draftGradingHealth}
                  />
                </section>
              </div>

              <section className="records-dock">
                <details className="records-expander">
                  <summary>
                    <div className="records-summary-copy">
                      <PanelHeader title="Session Records" />
                      <p className="panel-intro">
                        Open the dock for logs, the detailed decision ledger, and export controls.
                      </p>
                    </div>
                  </summary>

                  <div className="records-dock-body">
                    <AnalysisPanels state={state} logLimit={8} />

                    <div className="section-divider" />
                    <div className="stack-actions">
                      <button className="primary-button wide-button" type="button" onClick={() => downloadPlaythrough(activeStory, state)}>
                        Export playthrough log
                      </button>
                      <button className="secondary-button wide-button" type="button" onClick={handleRestart}>
                        Restart simulation
                      </button>
                    </div>
                  </div>
                </details>
              </section>
            </>
          ) : null}
        </>
      )}
    </main>
  );
}
