interface StatusPillProps {
  tone?: "neutral" | "good" | "warn";
  children: string;
}

export function StatusPill({ tone = "neutral", children }: StatusPillProps) {
  return <span className={`status-pill status-${tone}`}>{children}</span>;
}
