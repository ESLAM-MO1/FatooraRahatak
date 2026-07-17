export default function ToggleSwitch({
  enabled,
  onToggle,
  disabled,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`toggle ${enabled ? "toggle--on" : "toggle--off"}`}
    >
      <span className="toggle__thumb" />
    </button>
  );
}
