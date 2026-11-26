/** ↑ ↑ ↓ ↓ ← → ← → B A, as KeyboardEvent keys. */
const CHEAT_SEQUENCE = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];

/**
 * Watches a stream of keys for the cheat that toggles Third-person mode. Each key comes with a note of the moment it
 * was typed, so the cheat can hand back how things stood before its own keys changed them.
 */
export function createCheatDetector<Note>() {
  const recent: { key: string; note: Note }[] = [];
  return {
    /** When this key completes the cheat, the note taken with its first key; otherwise undefined. */
    type(key: string, note: Note): Note | undefined {
      recent.push({ key: key.toLowerCase(), note });
      if (recent.length > CHEAT_SEQUENCE.length) recent.shift();
      const complete = recent.length === CHEAT_SEQUENCE.length && recent.every((typed, index) => typed.key === CHEAT_SEQUENCE[index]);
      return complete ? recent[0].note : undefined;
    },
  };
}
