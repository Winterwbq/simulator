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
  const unreadCount = state.availableIds.filter((messageId) => !state.openedIds.includes(messageId)).length;
  const filterOptions = ["All", ...Array.from(new Set(state.availableIds.map((messageId) => story.messages[messageId].stakeholder))).sort()];

  return (
    <section className="sidebar-panel">
      <PanelHeader title="Inbox" badgeText={`${unreadCount} unread`} />
      <p className="panel-intro">
        Open the next message, compare stakeholder signals, and respond before the deadline hardens the narrative.
      </p>

      <label className="field-label" htmlFor="search-inbox">
        Find a message
      </label>
      <input
        id="search-inbox"
        className="text-input"
        type="text"
        value={state.searchQuery}
        placeholder="Search sender, subject, or body"
        onChange={(event) => onSearchChange(event.target.value)}
      />

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
