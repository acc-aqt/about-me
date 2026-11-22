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

  it("draws the intro, the Career road stops and the Contact mailbox as themed objects", () => {
    const ids = content.zones
      .filter((zone) => ["start", "career-road", "contact"].includes(zone.id))
      .flatMap((zone) => zone.pointsOfInterest.map((poi) => poi.id));
    expect(Object.fromEntries(ids.map((id) => [id, themedProp(id)]))).toEqual({
      intro: "welcome board",
      tum: "university",
      "bmw-group": "office tower",
      "canberra-detour": "kangaroo sign",
      "forward-engineering": "composites works",
      "arrk-engineering": "office block",
      mtu: "jet engine",
      "contact-board": "mailbox",
    });
  });

  it("has no themed object for an unknown Point of Interest, which keeps the signpost", () => {
    expect(themedProp("no-such-point")).toBeUndefined();
  });
});
