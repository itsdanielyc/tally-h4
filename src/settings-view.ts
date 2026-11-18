import { currencies } from "../domain/money";
import { element } from "./dom";
import type { ViewContext } from "./view-context";

/** Allows the ledger's unit of account to be selected before data is entered. */
export function renderSettings(parent: HTMLElement, context: ViewContext): void {
  const heading = element("header", undefined, "screen-heading");
  const title = element("h1", "Settings");
  title.id = "screen-title";
  heading.append(title);
  const form = element("form", undefined, "card settings");
  const label = element("label", "Ledger currency");
  const select = element("select");
  for (const currency of currencies) select.add(new Option(currency, currency));
  select.value = context.ledger.currency;
  const locked = context.ledger.transactions.length > 0;
  select.disabled = locked;
  label.append(select);
  const save = element("button", "Save currency", "primary");
  save.disabled = locked;
  save.type = "submit";
  form.append(label);
  if (locked) form.append(element("p", "Change currency while the ledger is empty.", "hint"));
  form.append(save);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    save.disabled = true;
    void context.commit(() => context.backend.setCurrency(select.value), "Currency saved.")
      .catch(context.report).finally(() => { save.disabled = locked; });
  });
  parent.append(heading, form);
}
