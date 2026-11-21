import type { InventoryItem } from "./content";

export type Inventory = {
  toggle(): void;
  isOpen(): boolean;
};

export function isInventoryKey(event: KeyboardEvent): boolean {
  return event.key.toLowerCase() === "i" && !event.ctrlKey && !event.metaKey && !event.altKey;
}

export function createInventory(dialog: HTMLDialogElement, items: InventoryItem[], onClose: () => void): Inventory {
  const list = dialog.querySelector<HTMLUListElement>(".inventory-items");
  if (!list) throw new Error("Inventory markup is missing .inventory-items");

  list.replaceChildren(
    ...items.map((item) => {
      const name = document.createElement("strong");
      name.textContent = item.name;
      const description = document.createElement("span");
      description.textContent = item.description;
      const entry = document.createElement("li");
      entry.append(name, description);
      return entry;
    }),
  );

  dialog.querySelector(".inventory-close")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("keydown", (event) => {
    if (isInventoryKey(event)) {
      event.preventDefault();
      dialog.close();
    }
  });
  dialog.addEventListener("close", onClose);

  return {
    toggle() {
      if (dialog.open) {
        dialog.close();
      } else {
        dialog.showModal();
        dialog.focus();
      }
    },
    isOpen: () => dialog.open,
  };
}
