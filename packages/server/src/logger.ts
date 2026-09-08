export function emit(event: Record<string, unknown>): void {
  const line = JSON.stringify({ ts: Date.now(), ...event });
  // stdout so `flyctl logs` (Day 2) and `| tee file.jsonl` (locally) both work.
  process.stdout.write(line + '\n');
}