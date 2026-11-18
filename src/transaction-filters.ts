import type { Ledger } from "../contracts/ledger";
import type { TransactionFilter } from "../contracts/transfer";
import { minorAmountText, parseMinorAmount } from "../domain/money";
import { transactionLimits } from "../domain/transactions";
import { command, element, formText, selectField } from "./dom";

const ALL = "all";
const UNCATEGORISED = "uncategorised";
const CATEGORY_PREFIX = "category:";

function filterField(title: string, name: string, type: string, value = ""): HTMLLabelElement {
  const label = element("label");
  const input = element("input");
  input.type = type;
  input.name = name;
  input.value = value;
  label.append(element("span", title), input);
  return label;
}

function readFilters(form: HTMLFormElement, currency: string): TransactionFilter {
  const data = new FormData(form);
  const category = formText(data, "category");
  const minimum = formText(data, "minimum").trim();
  const maximum = formText(data, "maximum").trim();
  return {
    search: formText(data, "search"),
    category: category === UNCATEGORISED ? null : category.startsWith(CATEGORY_PREFIX) ? category.slice(CATEGORY_PREFIX.length) : undefined,
    startDate: formText(data, "from") || undefined,
    endDate: formText(data, "through") || undefined,
    minimumMinor: minimum ? parseMinorAmount(minimum, currency) : undefined,
    maximumMinor: maximum ? parseMinorAmount(maximum, currency) : undefined,
  };
}

function amountField(label: string, name: string, value: number | undefined, currency: string): HTMLLabelElement {
  const field = filterField(label, name, "text", value === undefined ? "" : minorAmountText(value, currency));
  const input = field.querySelector("input");
  if (input) input.inputMode = "decimal";
  return field;
}

/** Keeps search and filter inputs stable while the table below them updates. */
export function filtersPanel(
  ledger: Ledger, initial: TransactionFilter, show: (filters: TransactionFilter) => void, invalidate: () => void,
): HTMLFormElement {
  const form = element("form", undefined, "card filters-panel");
  form.setAttribute("role", "search");
  form.setAttribute("aria-label", "Find transactions");
  const search = filterField("Search transactions", "search", "search", initial.search);
  const searchField = search.querySelector("input");
  if (searchField) {
    searchField.placeholder = "Payee or note";
    searchField.maxLength = transactionLimits.note;
  }
  const options = element("details");
  const selected = initial.category === null ? UNCATEGORISED
    : initial.category === undefined ? ALL : CATEGORY_PREFIX + initial.category;
  options.open = selected !== ALL || Boolean(initial.startDate || initial.endDate) ||
    initial.minimumMinor !== undefined || initial.maximumMinor !== undefined;
  const controls = element("div", undefined, "filter-fields");
  const categories = [[ALL, "All categories"], [UNCATEGORISED, "Uncategorised"]] as const;
  controls.append(
    selectField("Filter category", "category", [
      ...categories, ...ledger.categories.map((name) => [CATEGORY_PREFIX + name, name] as const),
    ], selected),
    filterField("From date", "from", "date", initial.startDate),
    filterField("Through date", "through", "date", initial.endDate),
    amountField("Minimum amount", "minimum", initial.minimumMinor, ledger.currency),
    amountField("Maximum amount", "maximum", initial.maximumMinor, ledger.currency),
  );
  const error = element("p", undefined, "inline-error");
  error.setAttribute("role", "alert");
  const update = (): void => {
    try {
      show(readFilters(form, ledger.currency));
      error.textContent = "";
    } catch (problem) {
      invalidate();
      error.textContent = problem instanceof Error ? problem.message : "The filters are invalid.";
    }
  };
  options.append(element("summary", "Filters"), controls);
  const top = element("div", undefined, "filter-top");
  const clear = command("Clear filters", () => {
    for (const input of form.querySelectorAll("input")) input.value = "";
    const category = form.querySelector("select");
    if (category) category.value = ALL;
    update();
  });
  top.append(search, clear);
  form.append(top, options, error);
  form.addEventListener("input", update);
  form.addEventListener("submit", (event) => { event.preventDefault(); update(); });
  return form;
}
