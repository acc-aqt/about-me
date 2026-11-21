import type { PointOfInterest } from "./content";

export type Viewfinder = {
  open(poi: PointOfInterest): void;
  isOpen(): boolean;
};

function query<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Viewfinder markup is missing ${selector}`);
  return element;
}

function setOptionalText(element: HTMLElement, text: string | undefined) {
  element.textContent = text ?? "";
  element.hidden = !text;
}

export function createViewfinder(dialog: HTMLDialogElement, onClose: () => void): Viewfinder {
  const title = query<HTMLElement>(dialog, "#viewfinder-title");
  const subtitle = query<HTMLElement>(dialog, ".viewfinder-subtitle");
  const dates = query<HTMLElement>(dialog, ".viewfinder-dates");
  const photos = query<HTMLElement>(dialog, ".viewfinder-photos");
  const body = query<HTMLElement>(dialog, ".viewfinder-body");
  const links = query<HTMLUListElement>(dialog, ".viewfinder-links");
  const closeButton = query<HTMLButtonElement>(dialog, ".viewfinder-close");

  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("keydown", (event) => {
    if (event.key === " ") {
      event.preventDefault();
      dialog.close();
    }
  });
  dialog.addEventListener("close", onClose);

  function render(poi: PointOfInterest) {
    title.textContent = poi.title;
    setOptionalText(subtitle, poi.subtitle);
    setOptionalText(dates, poi.dates);
    body.textContent = poi.body;

    photos.replaceChildren(
      ...(poi.photos ?? []).map((photo) => {
        const img = document.createElement("img");
        img.src = photo.src;
        img.alt = photo.alt;
        return img;
      }),
    );
    photos.hidden = photos.childElementCount === 0;

    links.replaceChildren(
      ...(poi.links ?? []).map((link) => {
        const anchor = document.createElement("a");
        anchor.href = link.url;
        anchor.textContent = link.label;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        const item = document.createElement("li");
        item.append(anchor);
        return item;
      }),
    );
    links.hidden = links.childElementCount === 0;
  }

  return {
    open(poi) {
      render(poi);
      dialog.showModal();
      dialog.focus();
    },
    isOpen: () => dialog.open,
  };
}
