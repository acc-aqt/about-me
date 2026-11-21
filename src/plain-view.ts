import type { Content, PointOfInterest, Zone } from "./content";
import { photoPaths } from "./photos.ts";

export const PLAIN_VIEW_PLACEHOLDER = "<!-- plain-view-content -->";

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function optionalParagraph(className: string, text: string | undefined): string {
  return text ? `<p class="${className}">${escapeHtml(text)}</p>` : "";
}

function renderPointOfInterest(poi: PointOfInterest): string {
  const headingId = `poi-${poi.id}`;
  const photos = (poi.photos ?? [])
    .map((photo) => `<img src="../${escapeHtml(photoPaths(photo).full)}" alt="${escapeHtml(photo.alt)}" loading="lazy" />`)
    .join("");
  const links = (poi.links ?? [])
    .map(
      (link) =>
        `<li><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a></li>`,
    )
    .join("");

  return `<article class="poi" aria-labelledby="${headingId}">
<header><h3 id="${headingId}">${escapeHtml(poi.title)}</h3>${optionalParagraph("poi-subtitle", poi.subtitle)}${optionalParagraph("poi-dates", poi.dates)}</header>
<p>${escapeHtml(poi.body)}</p>
${photos ? `<div class="poi-photos">${photos}</div>` : ""}
${links ? `<ul class="poi-links">${links}</ul>` : ""}
</article>`;
}

function renderZone(zone: Zone): string {
  const headingId = `zone-${zone.id}`;
  return `<section class="zone" id="${zone.id}" aria-labelledby="${headingId}">
<h2 id="${headingId}">${escapeHtml(zone.title)}</h2>
${zone.pointsOfInterest.map(renderPointOfInterest).join("\n")}
</section>`;
}

export function renderPlainView(content: Content): string {
  return content.zones.map(renderZone).join("\n");
}
