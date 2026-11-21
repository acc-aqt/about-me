import type { Photo, PointOfInterest } from "./content";
import { photoPaths } from "./photos";

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
  const photo = query<HTMLImageElement>(dialog, ".viewfinder-photo");
  const photoNav = query<HTMLElement>(dialog, ".viewfinder-photo-nav");
  const photoCount = query<HTMLElement>(dialog, ".viewfinder-photo-count");
  const previousButton = query<HTMLButtonElement>(dialog, ".viewfinder-previous");
  const nextButton = query<HTMLButtonElement>(dialog, ".viewfinder-next");
  const body = query<HTMLElement>(dialog, ".viewfinder-body");
  const links = query<HTMLUListElement>(dialog, ".viewfinder-links");
  const closeButton = query<HTMLButtonElement>(dialog, ".viewfinder-close");

  let shownPhotos: Photo[] = [];
  let photoIndex = 0;

  function showPhoto(index: number) {
    photoIndex = (index + shownPhotos.length) % shownPhotos.length;
    const shown = shownPhotos[photoIndex];
    photo.src = import.meta.env.BASE_URL + photoPaths(shown).full;
    photo.alt = shown.alt;
    photoCount.textContent = `Photo ${photoIndex + 1} of ${shownPhotos.length}`;
  }

  function stepPhoto(step: number) {
    if (shownPhotos.length > 1) showPhoto(photoIndex + step);
  }

  closeButton.addEventListener("click", () => dialog.close());
  previousButton.addEventListener("click", () => stepPhoto(-1));
  nextButton.addEventListener("click", () => stepPhoto(1));
  dialog.addEventListener("keydown", (event) => {
    if (event.key === " ") {
      event.preventDefault();
      dialog.close();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      stepPhoto(event.key === "ArrowLeft" ? -1 : 1);
    }
  });
  dialog.addEventListener("close", onClose);

  function render(poi: PointOfInterest) {
    title.textContent = poi.title;
    setOptionalText(subtitle, poi.subtitle);
    setOptionalText(dates, poi.dates);
    body.textContent = poi.body;

    shownPhotos = poi.photos ?? [];
    photos.hidden = shownPhotos.length === 0;
    photoNav.hidden = shownPhotos.length < 2;
    if (shownPhotos.length > 0) showPhoto(0);
    else photo.removeAttribute("src");

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
