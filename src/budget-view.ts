import { minorAmountText, parseMinorAmount } from "../domain/money";
import { command, element, formText, required, selectField, textField } from "./dom";
import { submitAction } from "./form-action";
import type { ViewContext } from "./view-context";

const MAXIMUM_AMOUNT_LENGTH = 64;

/** Displays the editor for recurring monthly limits on existing categories. */
export function budgetPanel(context: ViewContext): HTMLElement {
  const panel = element("section", undefined, "card management-panel");
  panel.append(element("h2", "Category budgets"));
  const categories = context.ledger.categories.map((category) => [category, category] as const);
  if (!categories.length) {
    panel.append(element("p", "Create a category to set its monthly budget.", "hint"));
    return panel;
  }
  const form = element("form", undefined, "budget-form");
  const categoryField = selectField("Budget category", "category", categories, categories[0][0]);
  const amountField = textField("Monthly budget", "amount", MAXIMUM_AMOUNT_LENGTH);
  const category = required<HTMLSelectElement>(categoryField, "select");
  const amount = required<HTMLInputElement>(amountField, "input");
  amount.inputMode = "decimal";
  const remove = command("Remove budget", () => {
    void context.commit(() => context.backend.setBudget({ category: category.value, amountMinor: null }), "Budget removed.")
      .catch(context.report);
  });
  const loadBudget = (): void => {
    const current = context.ledger.budgets.find((budget) => budget.category === category.value);
    amount.value = current ? minorAmountText(current.amountMinor, context.ledger.currency) : "";
    remove.disabled = !current;
  };
  category.addEventListener("change", loadBudget);
  loadBudget();
  form.append(categoryField, amountField);
  const save = submitAction(form, "Save budget", async (values) => {
    const amountMinor = parseMinorAmount(formText(values, "amount"), context.ledger.currency);
    await context.commit(
      () => context.backend.setBudget({ category: formText(values, "category"), amountMinor }),
      "Budget saved.",
    );
  }, context.report);
  const actions = element("div", undefined, "manage-actions");
  actions.append(save, remove);
  form.append(actions);
  panel.append(form);
  return panel;
}
