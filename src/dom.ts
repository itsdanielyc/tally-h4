let selectLabels = 0;

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

export function textField(text: string, name: string, maximum: number, initial = ""): HTMLLabelElement {
  const label = element("label", text);
  const input = element("input");
  input.name = name;
  input.maxLength = maximum;
  input.value = initial;
  input.required = true;
  label.append(input);
  return label;
}

export function selectField(
  labelText: string, name: string, options: readonly (readonly [string, string])[], value: string,
): HTMLLabelElement {
  const label = element("label");
  const caption = element("span", labelText);
  caption.id = "select-label-" + ++selectLabels;
  const select = element("select");
  select.name = name;
  select.setAttribute("aria-labelledby", caption.id);
  for (const [key, text] of options) select.add(new Option(text, key));
  select.value = value;
  label.append(caption, select);
  return label;
}
