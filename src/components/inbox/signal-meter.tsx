interface SignalMeterProps {
  label: string;
  value: number;
  valueLabel?: string;
  tone?: "lime" | "blue" | "amber" | "neutral";
}

export function SignalMeter({ label, value, valueLabel, tone = "lime" }: SignalMeterProps) {
  const bounded = Math.min(Math.max(value, 0), 1);
  return (
    <div className="signal-meter">
      <div className="signal-meter__header">
        <span>{label}</span>
        <strong>{valueLabel ?? `${Math.round(bounded * 100)}%`}</strong>
      </div>
      <div
        className="signal-meter__track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(bounded * 100)}
      >
        <span
          className={`signal-meter__fill signal-meter__fill--${tone}`}
          style={{ width: `${bounded * 100}%` }}
        />
      </div>
    </div>
  );
}
