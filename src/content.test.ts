import { describe, expect, it } from "vitest";
import { content, zoneById } from "./content";
import { neverShowItemsIn } from "./never-show";
import { PIXEL_FONT_CHARS } from "./pixel-font";

const pointsOfInterest = content.zones.flatMap((zone) => zone.pointsOfInterest);

function linkUrls(poiId: string) {
  const poi = pointsOfInterest.find((candidate) => candidate.id === poiId);
  if (!poi) throw new Error(`No Point of Interest with id ${poiId}`);
  return (poi.links ?? []).map((link) => link.url);
}

describe("Content file", () => {
  it("lists the Munich Hub, where the Player spawns, first", () => {
    expect(content.zones[0].id).toBe("start");
    expect(content.zones[0].title).toMatch(/Munich/);
  });

  it("opens the Start Zone with an intro Point of Interest about Alexander", () => {
    const [intro] = zoneById("start").pointsOfInterest;
    expect(intro?.id).toBe("intro");
    expect(intro.body).toMatch(/MTU Aero Engines/);
    expect(intro.body).toMatch(/photographer/);
  });

  it("has an MTU Aero Engines Point of Interest", () => {
    const mtu = pointsOfInterest.find((poi) => poi.id === "mtu");
    expect(mtu?.title).toBe("MTU Aero Engines");
  });

  it("has a Contact Zone linking LinkedIn, GitHub, Instagram and carrels.photography", () => {
    const contact = zoneById("contact");
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

  it("has an Inventory of skills and tools, including the CAE and photography ones", () => {
    const names = content.inventory.map((item) => item.name);
    expect(names).toEqual(expect.arrayContaining(["Python", "LS-DYNA", "Abaqus", "CATIA V5", "Git", "Lightroom Classic"]));
  });

  it("gives every Inventory item a unique id, a name and a description", () => {
    for (const item of content.inventory) {
      expect(item.id, item.name).toMatch(/^[a-z0-9-]+$/);
      expect(item.name.trim(), item.id).not.toBe("");
      expect(item.description.trim(), item.id).not.toBe("");
    }
    const ids = content.inventory.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every Zone an id and title", () => {
    for (const zone of content.zones) {
      expect(zone.id, JSON.stringify(zone)).toMatch(/^[a-z0-9-]+$/);
      expect(zone.title.trim()).not.toBe("");
    }
  });

  it("gives every Point of Interest the required fields", () => {
    for (const zone of content.zones) {
      for (const poi of zone.pointsOfInterest) {
        expect(poi.id, poi.title).toMatch(/^[a-z0-9-]+$/);
        expect(poi.title.trim(), poi.id).not.toBe("");
        expect(poi.body.trim(), poi.id).not.toBe("");
      }
    }
  });

  it("hides one Film roll in every Zone", () => {
    for (const zone of content.zones) {
      expect(zone.filmRoll, zone.id).toBeDefined();
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

  it("puts Norway ski touring on the Photography trail with several photos", () => {
    const norway = zoneById("photography-trail").pointsOfInterest.find((poi) => poi.id === "norway");
    expect(norway?.title).toMatch(/Norway/);
    expect(norway?.photos?.length).toBeGreaterThanOrEqual(2);
  });

  it("walks the Photography trail through the trips in chronological order, ending in the darkroom", () => {
    const trail = zoneById("photography-trail");
    expect(trail.pointsOfInterest.map((poi) => poi.title)).toEqual([
      "Jordan",
      "Norway ski touring",
      "New York",
      "Nepal",
      "Lisbon",
      "Eastern Adriatic",
      "Peru",
      "Darkroom",
    ]);
  });

  it("gives every trip on the Photography trail a few curated photos and a link to its carrels.photography gallery", () => {
    for (const poi of zoneById("photography-trail").pointsOfInterest) {
      const galleries = new Set((poi.photos ?? []).map((photo) => photo.src.split("/")[0]));
      expect(poi.photos?.length, poi.id).toBeGreaterThanOrEqual(4);
      expect(poi.photos?.length, poi.id).toBeLessThanOrEqual(6);
      expect(galleries.size, poi.id).toBe(1);
      expect(linkUrls(poi.id), poi.id).toContain(`https://www.carrels.photography/${[...galleries][0]}/`);
    }
  });

  it("holds the Analog gallery in the darkroom, captioned with the film each photo was shot on", () => {
    const darkroom = zoneById("photography-trail").pointsOfInterest.find((poi) => poi.id === "darkroom")!;
    expect(darkroom.body).toMatch(/35mm/);
    expect(darkroom.body).toMatch(/medium format/);
    expect(linkUrls("darkroom")).toEqual(["https://www.carrels.photography/analog/"]);
    for (const photo of darkroom.photos ?? []) {
      expect(photo.src).toMatch(/^analog\//);
      expect(photo.caption, photo.src).toMatch(/Film: .+ \((35mm|120 medium format)\)/);
    }
  });

  it("names a carrels-photography gallery file as the source of every photo", () => {
    for (const poi of pointsOfInterest) {
      for (const photo of poi.photos ?? []) {
        expect(photo.src, poi.id).toMatch(/^[a-z0-9_-]+\/[A-Za-z0-9_-]+_med_q80\.jpg$/i);
      }
    }
  });

  it("describes every photo in alt text of at least a few words", () => {
    for (const poi of pointsOfInterest) {
      for (const photo of poi.photos ?? []) {
        expect(photo.alt.trim().split(/\s+/).length, `${poi.id}: ${photo.src}`).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("only uses characters the in-world pixel font can draw in Zone and Point of Interest titles", () => {
    const titles = [...content.zones.map((zone) => zone.title), ...pointsOfInterest.map((poi) => poi.title)];
    for (const title of titles) {
      const missing = [...title].filter((char) => !PIXEL_FONT_CHARS.includes(char));
      expect(missing, title).toEqual([]);
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
