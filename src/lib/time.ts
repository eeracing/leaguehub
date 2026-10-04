export function formatDurationMs(timeMs: number, includeHours = false): string {
  if (!Number.isFinite(timeMs) || timeMs < 0) return '—';
  const totalMs = Math.round(timeMs);
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1_000);
  const milliseconds = totalMs % 1_000;
  const tail = `${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  return includeHours || hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${tail}`
    : `${minutes}:${tail}`;
}
