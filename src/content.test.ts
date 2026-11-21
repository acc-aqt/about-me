import { describe, expect, it } from "vitest";
import { content } from "./content";

const pointsOfInterest = content.zones.flatMap((zone) => zone.pointsOfInterest);

function zoneById(id: string) {
  const zone = content.zones.find((candidate) => candidate.id === id);
  if (!zone) throw new Error(`No Zone with id ${id}`);
  return zone;
}

function linkUrls(poiId: string) {
  const poi = pointsOfInterest.find((candidate) => candidate.id === poiId);
  if (!poi) throw new Error(`No Point of Interest with id ${poiId}`);
  return (poi.links ?? []).map((link) => link.url);
}

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

  it("ends the Route with a Contact Zone linking LinkedIn, GitHub, Instagram and carrels.photography", () => {
    const contact = content.zones.at(-1)!;
    expect(contact.id).toBe("contact");
    const urls = contact.pointsOfInterest.flatMap((poi) => poi.links ?? []).map((link) => link.url);
    expect(urls).toEqual([
      "https://de.linkedin.com/in/alexander-carrels-8b98b0182",
      "https://github.com/acc-aqt",
      "https://www.instagram.com/carrels.photography/",
      "https://www.carrels.photography/",
    ]);
  });

  it("only lets Fast-travel land at a Point of Interest inside the same Zone", () => {
    for (const zone of content.zones) {
      if (zone.fastTravelTo === undefined) continue;
      expect(zone.pointsOfInterest.map((poi) => poi.id), zone.id).toContain(zone.fastTravelTo);
    }
  });

  it("walks the Career road from TUM to the MTU Aero Engines hangar", () => {
    const careerRoad = zoneById("career-road");
    expect(careerRoad.pointsOfInterest.map((poi) => poi.title)).toEqual([
      "Technical University of Munich",
      "BMW Group",
      "Canberra detour",
      "Forward Engineering",
      "ARRK Engineering",
      "MTU Aero Engines",
    ]);
  });

  it("gives every Career road stop a role, dates and a one-line summary", () => {
    const careerRoad = zoneById("career-road");
    for (const poi of careerRoad.pointsOfInterest) {
      expect(poi.subtitle?.trim(), poi.id).toBeTruthy();
      expect(poi.dates?.trim(), poi.id).toBeTruthy();
      expect(poi.body, poi.id).not.toContain("\n");
    }
  });

  it("places Career road stops left to right", () => {
    const careerRoad = zoneById("career-road");
    const xs = careerRoad.pointsOfInterest.map((poi) => poi.placement.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it("orders the Zones it has along the Route as the spec does", () => {
    const routeOrder = ["start", "career-road", "maker-workshop", "photography-trail", "sport", "music-and-games", "contact"];
    const present = content.zones.map((zone) => zone.id).filter((id) => routeOrder.includes(id));
    expect(present).toEqual(routeOrder.filter((id) => present.includes(id)));
  });

  it("has a Maker workshop with framewise, lens caps, ReelMaker and preset fitting", () => {
    const zone = zoneById("maker-workshop");
    expect(zone.title).toBe("Maker workshop");
    expect(zone.pointsOfInterest.map((poi) => poi.title)).toEqual([
      "framewise",
      "3D-printed lens caps",
      "ReelMaker",
      "Lightroom preset fitting",
    ]);
  });

  it("links framewise to GitHub and to PyPI as framewise-cull", () => {
    expect(linkUrls("framewise")).toEqual([
      "https://github.com/acc-aqt/framewise",
      "https://pypi.org/project/framewise-cull/",
    ]);
  });

  it("links the lens caps to their public repo and leaves private projects unlinked", () => {
    expect(linkUrls("lens-caps")).toEqual(["https://github.com/acc-aqt/lens-cap-model"]);
    expect(linkUrls("reelmaker")).toEqual([]);
    expect(linkUrls("preset-fitting")).toEqual([]);
  });

  it("has a Sport Zone with a swimming pool, tennis court and ski-touring slope", () => {
    const zone = zoneById("sport");
    expect(zone.title).toBe("Sport");
    expect(zone.pointsOfInterest.map((poi) => poi.title)).toEqual([
      "Swimming pool",
      "Tennis court",
      "Ski-touring slope",
    ]);
  });

  it("has a Music & games Zone with the track-back jukebox linking to its web demo", () => {
    const zone = zoneById("music-and-games");
    expect(zone.title).toBe("Music & games");
    expect(zone.pointsOfInterest.map((poi) => poi.id)).toEqual(["track-back"]);
    expect(linkUrls("track-back")).toEqual([
      "https://acc-aqt.github.io/track-back/web_ui/index.html",
      "https://github.com/acc-aqt/track-back",
    ]);
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

  it("hides one Film roll inside every Zone, away from its Points of Interest", () => {
    for (const zone of content.zones) {
      expect(zone.filmRoll, zone.id).toBeDefined();
      expect(zone.filmRoll!.x, zone.id).toBeGreaterThanOrEqual(0);
      expect(zone.filmRoll!.x, zone.id).toBeLessThanOrEqual(zone.width);
      for (const poi of zone.pointsOfInterest) {
        expect(Math.abs(zone.filmRoll!.x - poi.placement.x), `${zone.id} roll vs ${poi.id}`).toBeGreaterThan(40);
      }
    }
  });

  it("has a Film roll bonus that teases the Analog gallery", () => {
    expect(content.filmRollBonus.title.trim()).not.toBe("");
    expect(content.filmRollBonus.body).toMatch(/Analog gallery/);
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
