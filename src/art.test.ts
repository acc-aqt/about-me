import { describe, expect, it } from "vitest";
import { themedProp } from "./art";
import { content } from "./content";

describe("Overworld art", () => {
  it("draws every trip on the Photography trail as a camera stand and the Darkroom as its door", () => {
    const trail = content.zones.find((zone) => zone.id === "photography-trail")!.pointsOfInterest;
    const props = trail.map((poi) => themedProp(poi.id));
    expect(props.slice(0, -1).every((prop) => prop === "camera stand")).toBe(true);
    expect(props.at(-1)).toBe("darkroom door");
  });

  it("has no themed object for an unknown Point of Interest, which keeps the signpost", () => {
    expect(themedProp("no-such-point")).toBeUndefined();
  });
});
