import { describe, expect, it } from "vitest";
import { content } from "./content";

const pointsOfInterest = content.zones.flatMap((zone) => zone.pointsOfInterest);

const NEVER_SHOW: { item: string; pattern: RegExp }[] = [
  { item: "email", pattern: /[\w.+-]+@[\w-]+\.[\w.]+|mailto:/i },
  { item: "phone", pattern: /tel:|\+\d[\d\s/-]{6,}\d|\b0\d{2,4}[\s/-]?\d{4,}\b/ },
  {
    item: "street address",
    pattern: /\b\w*(straße|strasse|str\.|weg|platz|gasse)\s+\d+|\b\d+\s+\w+\s+(street|st\.|road|avenue|ave\.)/i,
  },
  { item: "CV", pattern: /\bCV\b|curriculum vitae|\bresum[eé]\b|lebenslauf/i },
  { item: "dj-urska", pattern: /dj[-\s]?urska/i },
  { item: "tado-cli", pattern: /tado[-\s]?cli/i },
  { item: "lisp-skills", pattern: /lisp[-\s]?skills/i },
  { item: "swimming coaching", pattern: /swim\w*\s+(coach|train(er|ing)\s+(kids|children|others))/i },
];

function neverShowItemsIn(text: string): string[] {
  return NEVER_SHOW.filter(({ pattern }) => pattern.test(text)).map(({ item }) => item);
}

describe("Content file", () => {
  it("starts the Route with the Munich Start Zone", () => {
    expect(content.zones[0].id).toBe("start");
    expect(content.zones[0].title).toMatch(/Munich/);
  });

  it("has an MTU Aero Engines Point of Interest", () => {
    const mtu = pointsOfInterest.find((poi) => poi.id === "mtu");
    expect(mtu?.title).toBe("MTU Aero Engines");
  });

  it("gives every Zone an id, title and positive width", () => {
    for (const zone of content.zones) {
      expect(zone.id, JSON.stringify(zone)).toMatch(/^[a-z0-9-]+$/);
      expect(zone.title.trim()).not.toBe("");
      expect(zone.width).toBeGreaterThan(0);
    }
  });

  it("gives every Point of Interest the required fields and a placement inside its Zone", () => {
    for (const zone of content.zones) {
      for (const poi of zone.pointsOfInterest) {
        expect(poi.id, poi.title).toMatch(/^[a-z0-9-]+$/);
        expect(poi.title.trim(), poi.id).not.toBe("");
        expect(poi.body.trim(), poi.id).not.toBe("");
        expect(poi.placement.x, poi.id).toBeGreaterThanOrEqual(0);
        expect(poi.placement.x, poi.id).toBeLessThanOrEqual(zone.width);
      }
    }
  });

  it("uses unique ids across Zones and Points of Interest", () => {
    const ids = [...content.zones.map((zone) => zone.id), ...pointsOfInterest.map((poi) => poi.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only has well-formed https links with labels", () => {
    for (const poi of pointsOfInterest) {
      for (const link of poi.links ?? []) {
        expect(link.label.trim(), poi.id).not.toBe("");
        expect(new URL(link.url).protocol, link.url).toBe("https:");
      }
    }
  });

  it("gives every photo a source and alt text", () => {
    for (const poi of pointsOfInterest) {
      for (const photo of poi.photos ?? []) {
        expect(photo.src.trim(), poi.id).not.toBe("");
        expect(photo.alt.trim(), `${poi.id}: ${photo.src}`).not.toBe("");
      }
    }
  });

  it("contains none of the never-show items", () => {
    expect(neverShowItemsIn(JSON.stringify(content))).toEqual([]);
  });
});

describe("never-show check", () => {
  it.each([
    ["email", "write to alex@example.com"],
    ["phone", "call +49 89 1234567"],
    ["street address", "Leopoldstraße 12, Munich"],
    ["CV", "Download my CV"],
    ["dj-urska", "see dj-urska"],
    ["tado-cli", "built tado-cli"],
    ["lisp-skills", "my lisp-skills repo"],
    ["swimming coaching", "swimming coach for juniors"],
  ])("catches %s", (item, text) => {
    expect(neverShowItemsIn(text)).toContain(item);
  });

  it("does not flag ordinary portfolio text", () => {
    expect(neverShowItemsIn("Career road from Munich, 2020–now. Swimming, tennis and ski touring.")).toEqual([]);
  });
});
