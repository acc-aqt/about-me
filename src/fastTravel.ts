import type { Zone, ZoneId } from "./content";

function fastTravelLabel(zone: Zone): string {
  const landing = zone.pointsOfInterest.find((poi) => poi.id === zone.fastTravelTo);
  return landing ? `${zone.title} · ${landing.title}` : zone.title;
}

export function createFastTravel(
  toggle: HTMLButtonElement,
  list: HTMLUListElement,
  zones: Zone[],
  onTravel: (zoneId: ZoneId) => void,
) {
  function setOpen(open: boolean) {
    toggle.setAttribute("aria-expanded", String(open));
    list.hidden = !open;
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

  function closeOnEscape(event: KeyboardEvent) {
    if (event.key === "Escape" && !list.hidden) {
      setOpen(false);
      toggle.focus();
    }
  }
  toggle.addEventListener("keydown", closeOnEscape);
  list.addEventListener("keydown", closeOnEscape);

  setOpen(false);
}
