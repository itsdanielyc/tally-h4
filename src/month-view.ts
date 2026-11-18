import type { CategoryMonth, MonthSummary } from "../contracts/month";
import { formatMoney } from "../domain/money";
import { shiftMonth } from "../domain/month";
import { budgetPanel } from "./budget-view";
import { command, element } from "./dom";
import type { ViewContext } from "./view-context";

const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", timeZone: "UTC" });
const PERCENT = 100n;

function currentMonth(): string {
  const today = new Date();
  return String(today.getFullYear()).padStart(4, "0") + "-" + String(today.getMonth() + 1).padStart(2, "0");
}

let selectedMonth = currentMonth();

function metric(label: string, value: bigint, currency: string, id: string): HTMLElement {
  const card = element("article", undefined, "card summary-metric");
  const amount = element("strong", formatMoney(value, currency));
  amount.dataset.testid = id;
  card.append(element("span", label), amount);
  return card;
}

function budgetRatio(row: CategoryMonth): number {
  if (row.spentMinor === 0n || row.budgetMinor === null) return 0;
  if (row.spentMinor >= BigInt(row.budgetMinor)) return Number(PERCENT);
  return Number(row.spentMinor * PERCENT / BigInt(row.budgetMinor));
}

function balanceCell(row: CategoryMonth, currency: string): HTMLTableCellElement {
  if (row.remainingMinor === null) return element("td", "—", "align-end");
  const amount = row.remainingMinor;
  const over = amount < 0n;
  const cell = element("td", undefined, over ? "align-end over" : "align-end");
  const label = formatMoney(over ? -amount : amount, currency) + (over ? " over" : " left");
  const meter = element("div", undefined, "budget-track");
  const fill = element("span");
  fill.style.width = budgetRatio(row) + "%";
  meter.setAttribute("aria-hidden", "true");
  meter.append(fill);
  cell.append(element("span", label), meter);
  return cell;
}

function spendingTable(summary: MonthSummary): HTMLElement {
  const container = element("div", undefined, "card table-wrap");
  const table = element("table");
  table.setAttribute("aria-label", "Category spending");
  const header = table.createTHead().insertRow();
  for (const [index, title] of ["Category", "Spending", "Monthly budget", "Left or over"].entries()) {
    const cell = element("th", title, index ? "align-end" : "");
    cell.scope = "col";
    header.append(cell);
  }
  const body = table.createTBody();
  for (const line of summary.categories) {
    body.insertRow().append(
      element("td", line.category || "Uncategorised"),
      element("td", formatMoney(line.spentMinor, summary.currency), "amount"),
      element("td", line.budgetMinor === null ? "—" : formatMoney(line.budgetMinor, summary.currency), "align-end"),
      balanceCell(line, summary.currency),
    );
  }
  container.append(table);
  return container;
}

function summaryContent(panel: HTMLElement, result: MonthSummary): void {
  const cards = element("div", undefined, "summary-metrics");
  const { currency } = result;
  cards.append(
    metric("Income", result.incomeMinor, currency, "month-income"),
    metric("Spending", result.spendingMinor, currency, "month-spending"),
    metric("Net", result.netMinor, currency, "month-net"),
  );
  panel.replaceChildren(cards);
  if (result.categories.length) panel.append(spendingTable(result));
}

/** Shows calendar navigation, exact monthly totals and budget editing. */
export function renderMonth(parent: HTMLElement, context: ViewContext): void {
  const heading = element("header", undefined, "screen-heading");
  const title = element("h1", "Monthly summary");
  title.id = "screen-title";
  const navigation = element("div", undefined, "month-navigation");
  const label = element("label", undefined, "month-picker");
  const input = element("input");
  input.type = "month";
  input.setAttribute("aria-label", "Month");
  label.append(input);
  const back = command("Previous month", () => load(shiftMonth(selectedMonth, -1)));
  const forward = command("Next month", () => load(shiftMonth(selectedMonth, 1)));
  navigation.append(back, label, forward);
  heading.append(title, navigation);

  const dateLabel = element("h2");
  const panel = element("div", undefined, "month-results");
  const load = (value: string): void => {
    if (!value) {
      input.value = selectedMonth;
      return;
    }
    selectedMonth = value;
    input.value = value;
    back.disabled = shiftMonth(value, -1) === value;
    forward.disabled = shiftMonth(value, 1) === value;
    dateLabel.textContent = MONTH_FORMAT.format(new Date(value + "-01T00:00:00Z"));
    void context.backend.getMonth(value).then((result) => {
      if (input.value === result.month) summaryContent(panel, result);
    }).catch(context.report);
  };
  input.addEventListener("change", () => {
    if (input.validity.valid) load(input.value);
  });
  input.min = "0001-01";
  input.max = "9999-12";
  parent.append(heading, dateLabel, panel, budgetPanel(context));
  load(selectedMonth);
}
