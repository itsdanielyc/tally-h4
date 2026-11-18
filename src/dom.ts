/** Creates a typed element and assigns content without interpreting ledger text as markup. */
export function element<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag, text?: string, className?: string,
): HTMLElementTagNameMap[Tag] {
  const created = document.createElement(tag);
  if (text !== undefined) created.textContent = text;
  if (className) created.className = className;
  return created;
}

/** Resolves a required static control and exposes an actionable error for broken markup. */
export function required<ElementType extends HTMLElement>(root: ParentNode, selector: string): ElementType {
  const found = root.querySelector<ElementType>(selector);
  if (!found) throw new Error("A required Tally control is missing (" + selector + ").");
  return found;
}

export function command(label: string, action: () => void, className = ""): HTMLButtonElement {
  const button = element("button", label, className);
  button.type = "button";
  button.addEventListener("click", action);
  return button;
}

export function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
