/** ↑ ↑ ↓ ↓ ← → ← → B A, as KeyboardEvent keys. */
const CHEAT_SEQUENCE = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];

/** Watches a stream of keys for the cheat that toggles Third-person mode. */
export function createCheatDetector() {
  const recent: string[] = [];
  return {
    /** True when this key completes the cheat. */
    type(key: string): boolean {
      recent.push(key.toLowerCase());
      if (recent.length > CHEAT_SEQUENCE.length) recent.shift();
      return recent.length === CHEAT_SEQUENCE.length && recent.every((typed, index) => typed === CHEAT_SEQUENCE[index]);
    },
  };
}
