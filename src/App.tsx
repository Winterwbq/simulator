import { useEffect, useMemo, useState } from "react";
import { story as storyData } from "./data/story";
import { AnalysisPanels } from "./components/AnalysisPanels";
import { BriefingPanel } from "./components/BriefingPanel";
import { InboxPanel } from "./components/InboxPanel";
import { OpenEmailPanel } from "./components/OpenEmailPanel";
import { TimeBanner } from "./components/TimeBanner";
import { TrustDashboard } from "./components/TrustDashboard";
import { fetchDraftGradingHealth, gradeReplyWithApi } from "./lib/api";
import { getFilteredMessageIds, loadSimulationState, markMessageOpened, persistSimulationState, resetPersistedSimulationState, downloadPlaythrough, initializeSimulation, applyChoice, applyDraftedReply, buildPresetReplyText, inferReplyTypeForMessage, updateDraftReply } from "./lib/simulation";
import { validateStory } from "./lib/storyValidation";
import type { DraftGradingHealth, SimulationState } from "./lib/types";

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
  const validationErrors = useMemo(() => validateStory(storyData), []);
  const [state, setState] = useState<SimulationState>(() => loadSimulationState(storyData));
  const [draftGradingHealth, setDraftGradingHealth] = useState<DraftGradingHealth>(
    DEFAULT_DRAFT_GRADING_HEALTH,
  );

  const filteredIds = useMemo(() => getFilteredMessageIds(storyData, state), [state]);

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
    if (filteredIds.length === 0) {
      return;
    }
    if (state.selectedMessageId && filteredIds.includes(state.selectedMessageId)) {
      return;
    }
    setState((current) => ({ ...current, selectedMessageId: filteredIds[0] }));
  }, [filteredIds, state.selectedMessageId]);

  useEffect(() => {
    const stakeholders = ["All", ...Array.from(new Set(state.availableIds.map((messageId) => storyData.messages[messageId].stakeholder)))];
    if (stakeholders.includes(state.stakeholderFilter)) {
      return;
    }
    setState((current) => ({ ...current, stakeholderFilter: "All" }));
  }, [state.availableIds, state.stakeholderFilter]);

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
    resetPersistedSimulationState();
    setState(initializeSimulation(storyData));
  };

  const handleChoose = async (messageId: string, choiceIndex: number) => {
    const message = storyData.messages[messageId];
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

      setState((current) => applyChoice(storyData, current, messageId, choiceIndex, graded));
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
    const message = storyData.messages[messageId];
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

      setState((current) => applyDraftedReply(storyData, current, messageId, graded));
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

  const inOutcomeMode = Boolean(state.ending) || state.simulationComplete;
  const pageTitle = state.ending
    ? `Ending: ${state.ending.name}`
    : inOutcomeMode
      ? "Simulation Complete"
      : storyData.meta.title;

  return (
    <main className="app-shell">
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
            <button className="primary-button" type="button" onClick={() => downloadPlaythrough(storyData, state)}>
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
            story={storyData}
            showStartPrompt={state.showStartPrompt}
            onStartSimulation={() => setState((current) => ({ ...current, showStartPrompt: false }))}
            onDismissStartPrompt={() => setState((current) => ({ ...current, showStartPrompt: false }))}
          />
          <TimeBanner currentMinutes={state.currentMinutes} />
          {!state.showStartPrompt ? (
            <>
              {state.lastTimeAdvanceNotice ? <div className="callout info">{state.lastTimeAdvanceNotice}</div> : null}
              <p className="intro-copy">
                Open messages from the left, respond in the right pane, and watch how each move shifts stakeholder confidence.
              </p>

              <div className="two-column-layout">
                <aside className="left-column">
                  <InboxPanel
                    story={storyData}
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

                  <div className="section-divider" />
                  <TrustDashboard state={state} />

                  <div className="section-divider" />
                  <div className="stack-actions">
                    <button className="primary-button wide-button" type="button" onClick={() => downloadPlaythrough(storyData, state)}>
                      Export playthrough log
                    </button>
                    <button className="secondary-button wide-button" type="button" onClick={handleRestart}>
                      Restart simulation
                    </button>
                  </div>
                </aside>

                <section className="right-column">
                  <OpenEmailPanel
                    story={storyData}
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
                  <AnalysisPanels state={state} logLimit={8} />
                </section>
              </div>
            </>
          ) : null}
        </>
      )}
    </main>
  );
}
