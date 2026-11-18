export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="hsl(var(--accent))" />
        <circle cx="16" cy="16" r="6" fill="hsl(var(--accent-foreground))" opacity="0.95" />
      </svg>
      <span className="text-lg">Lumen</span>
    </span>
  );
}
