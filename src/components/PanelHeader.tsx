interface PanelHeaderProps {
  title: string;
  badgeText?: string;
}

export function PanelHeader({ title, badgeText }: PanelHeaderProps) {
  return (
    <div className="mail-toolbar">
      <div className="mail-pane-title">{title}</div>
      {badgeText ? <span className="mail-count">{badgeText}</span> : null}
    </div>
  );
}
