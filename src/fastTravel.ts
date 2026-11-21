import type { Zone } from "./content";

function fastTravelLabel(zone: Zone): string {
  const landing = zone.pointsOfInterest.find((poi) => poi.id === zone.fastTravelTo);
  return landing ? `${zone.title} · ${landing.title}` : zone.title;
}

export function createFastTravel(nav: HTMLElement, zones: Zone[], onTravel: (zoneId: string) => void) {
  const toggle = nav.querySelector<HTMLButtonElement>(".fast-travel-toggle");
  const list = nav.querySelector<HTMLUListElement>(".fast-travel-zones");
  if (!toggle || !list) throw new Error("Fast-travel markup is missing its toggle or Zone list");

  function setOpen(open: boolean) {
    toggle!.setAttribute("aria-expanded", String(open));
    list!.hidden = !open;
  }

  list.replaceChildren(
    ...zones.map((zone) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = fastTravelLabel(zone);
      button.addEventListener("click", () => {
        setOpen(false);
        onTravel(zone.id);
      });
      const item = document.createElement("li");
      item.append(button);
      return item;
    }),
  );

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    setOpen(open);
    if (open) list.querySelector("button")?.focus();
  });

  nav.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !list.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });

  setOpen(false);
}
