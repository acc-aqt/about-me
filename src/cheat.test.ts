import { describe, expect, it } from "vitest";
import { createCheatDetector } from "./cheat";

const CHEAT = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

/** Feeds keys to a fresh detector and returns the indices of the keys that completed the cheat. */
function completions(keys: string[]) {
  const cheat = createCheatDetector<number>();
  return keys.flatMap((key, index) => (cheat.type(key, index) === undefined ? [] : [index]));
}

describe("cheat detection", () => {
  it("recognises the exact sequence on its last key", () => {
    expect(completions(CHEAT)).toEqual([CHEAT.length - 1]);
  });

  it("tolerates leading noise, even a false start of the sequence itself", () => {
    const noise = ["w", "ArrowUp", "ArrowUp", "ArrowUp", "Shift", " "];
    expect(completions([...noise, "ArrowUp", ...CHEAT])).toEqual([noise.length + CHEAT.length]);
  });

  it("rejects the keys in a wrong order or with a stray key inside", () => {
    const swapped = [...CHEAT.slice(0, 8), "a", "b"];
    const interrupted = [...CHEAT.slice(0, 5), "x", ...CHEAT.slice(5)];
    expect(completions(swapped)).toEqual([]);
    expect(completions(interrupted)).toEqual([]);
    expect(completions(CHEAT.slice(0, -1))).toEqual([]);
  });

  it("accepts B and A typed in capitals", () => {
    expect(completions([...CHEAT.slice(0, 8), "B", "A"])).toEqual([CHEAT.length - 1]);
  });

  it("recognises the cheat again each time it is typed", () => {
    expect(completions([...CHEAT, ...CHEAT])).toEqual([CHEAT.length - 1, 2 * CHEAT.length - 1]);
  });

  it("hands back what was noted as the sequence's first key was typed, such as where the Player stood", () => {
    const cheat = createCheatDetector<string>();
    const keys = ["w", "ArrowUp", ...CHEAT];
    const results = keys.map((key, index) => cheat.type(key, `before key ${index}`));
    expect(results.at(-1)).toBe("before key 2");
  });
});
