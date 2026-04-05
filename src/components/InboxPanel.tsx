import { useState } from "react";
import { PanelHeader } from "./PanelHeader";
import { getMessagePreview, messageStatusLabel } from "../lib/simulation";
import type { SimulationState, Story } from "../lib/types";

interface InboxPanelProps {
  story: Story;
  state: SimulationState;
  filteredIds: string[];
  onSearchChange: (value: string) => void;
  onQuickFilterChange: (value: SimulationState["quickFilter"]) => void;
  onStakeholderFilterChange: (value: string) => void;
  onSelectMessage: (messageId: string) => void;
}

export function InboxPanel({
  story,
  state,
  filteredIds,
  onSearchChange,
  onQuickFilterChange,
  onStakeholderFilterChange,
  onSelectMessage,
}: InboxPanelProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const unreadCount = state.availableIds.filter((messageId) => !state.openedIds.includes(messageId)).length;
  const filterOptions = ["All", ...Array.from(new Set(state.availableIds.map((messageId) => story.messages[messageId].stakeholder))).sort()];
  const activeFilterCount =
    Number(state.quickFilter !== "All") + Number(state.stakeholderFilter !== "All");
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <section className="sidebar-panel">
      <PanelHeader title="Inbox" badgeText={`${unreadCount} unread`} />
      <p className="panel-intro">
        Open the next message, compare stakeholder signals, and respond before the deadline hardens the narrative.
      </p>

      <label className="field-label" htmlFor="search-inbox">
        Find a message
      </label>
      <div className="search-filter-row">
        <input
          id="search-inbox"
          className="text-input"
          type="text"
          value={state.searchQuery}
          placeholder="Search sender, subject, or body"
          onChange={(event) => onSearchChange(event.target.value)}
        />

        <button
          className={hasActiveFilters ? "compact-filter-button compact-filter-button-active" : "compact-filter-button"}
          type="button"
          aria-expanded={filtersOpen}
          aria-controls="inbox-filter-panel"
          onClick={() => setFiltersOpen((current) => !current)}
        >
          <span
            className={hasActiveFilters ? "compact-filter-icon compact-filter-icon-active" : "compact-filter-icon"}
            aria-hidden="true"
          >
            <svg viewBox="0 0 20 20" className="compact-filter-icon-svg">
              <path
                d="M3.5 5.25h13l-5.1 5.55v3.4l-2.8 1.55V10.8L3.5 5.25Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <svg
            viewBox="0 0 20 20"
            className={filtersOpen ? "compact-filter-chevron compact-filter-chevron-open" : "compact-filter-chevron"}
            aria-hidden="true"
          >
            <path
              d="M5.5 7.5 10 12l4.5-4.5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
          <span className="sr-only">{filtersOpen ? "Collapse filters" : "Expand filters"}</span>
        </button>
      </div>

      {filtersOpen ? (
        <div className="filter-panel-body" id="inbox-filter-panel">
          <div className="field-label">Show</div>
          <div className="radio-row">
            {(["All", "Unread", "Resolved"] as const).map((option) => (
              <label className="radio-pill" key={option}>
                <input
                  type="radio"
                  name="quick-filter"
                  checked={state.quickFilter === option}
                  onChange={() => onQuickFilterChange(option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>

          <label className="field-label" htmlFor="stakeholder-filter">
            Stakeholder
          </label>
          <select
            id="stakeholder-filter"
            className="select-input"
            value={filterOptions.includes(state.stakeholderFilter) ? state.stakeholderFilter : "All"}
            onChange={(event) => onStakeholderFilterChange(event.target.value)}
          >
            {filterOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="small-caption">{`${state.availableIds.length} unlocked messages`}</div>

      {filteredIds.length > 0 ? (
        <div className="inbox-list">
          {filteredIds.map((messageId) => {
            const message = story.messages[messageId];
            const isSelected = state.selectedMessageId === messageId;
            const isUnread = !state.openedIds.includes(messageId);
            const statusText = messageStatusLabel(state, messageId);
            const rowClasses = ["mail-row"];

            if (isSelected) {
              rowClasses.push("mail-row-selected");
            }
            if (isUnread) {
              rowClasses.push("mail-row-unread");
            }

            const statusClass =
              statusText === "Handled"
                ? "mail-badge-handled"
                : statusText === "Read"
                  ? "mail-badge-read"
                  : "mail-badge-unread";

            return (
              <button
                className="mail-select-button"
                key={messageId}
                type="button"
                onClick={() => onSelectMessage(messageId)}
              >
                <div className={rowClasses.join(" ")}>
                  <div className="mail-row-header">
                    <div className="mail-row-left">
                      <span className={isUnread ? "mail-unread-dot" : "mail-unread-dot mail-unread-dot-hidden"}>●</span>
                      <div className={isUnread ? "mail-sender mail-sender-unread" : "mail-sender"}>{message.from}</div>
                    </div>
                    <div className="mail-time">{message.time}</div>
                  </div>
                  <div className={isUnread ? "mail-subject mail-subject-unread" : "mail-subject"}>{message.subject}</div>
                  <div className="mail-preview">{getMessagePreview(message.body)}</div>
                  <div className="mail-tags">
                    <span className={`mail-badge ${statusClass}`}>{statusText}</span>
                    <span className="mail-badge mail-badge-stakeholder">
                      {`${message.stakeholder.charAt(0).toUpperCase()}${message.stakeholder.slice(1)}`}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="callout info">No unlocked emails match the current filters.</div>
      )}
    </section>
  );
}
