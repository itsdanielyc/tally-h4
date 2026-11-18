import type { Transaction } from "../contracts/ledger";
import type { TransactionFilter } from "../contracts/transfer";
import { filterTransactions } from "../domain/filters";
import { formatMoney } from "../domain/money";
import { command, element } from "./dom";
import { openTransactionEditor } from "./transaction-editor";
import { filtersPanel } from "./transaction-filters";
import type { ViewContext } from "./view-context";

function row(transaction: Transaction, context: ViewContext): HTMLTableRowElement {
  const date = element("td", transaction.date, "row-date");
  const payee = element("td");
  payee.append(element("span", transaction.payee, "payee"));
  if (transaction.note) payee.append(element("span", transaction.note, "row-note"));
  const category = element("td");
  category.append(element("span", transaction.category || "Uncategorised", "category"));
  const amount = element("td", formatMoney(transaction.amountMinor, context.ledger.currency), "amount");
  if (transaction.amountMinor > 0) amount.classList.add("income");
  const actions = element("td", undefined, "row-actions");
  const edit = command("Edit", () => openTransactionEditor(context, transaction), "text-button");
  edit.setAttribute("aria-label", "Edit " + transaction.payee);
  actions.append(edit);
  const line = element("tr");
  line.append(date, payee, category, amount, actions);
  return line;
}

let activeFilters: TransactionFilter = {};

function transactionTable(context: ViewContext, selection: readonly Transaction[]): HTMLElement {
  const table = element("table");
  table.setAttribute("aria-label", "Transactions");
  const head = table.createTHead().insertRow();
  for (const title of ["Date", "Payee", "Category", "Amount", "Actions"]) {
    const column = element("th", title);
    column.scope = "col";
    if (title === "Amount" || title === "Actions") column.className = "align-end";
    head.append(column);
  }
  const body = table.createTBody();
  const rows = document.createDocumentFragment();
  for (const transaction of selection) rows.append(row(transaction, context));
  body.append(rows);
  const overflow = element("div", undefined, "table-wrap");
  overflow.append(table);
  return overflow;
}

function showRows(card: HTMLElement, context: ViewContext, selection: readonly Transaction[]): void {
  if (selection.length) {
    card.replaceChildren(transactionTable(context, selection));
    return;
  }
  const empty = element("div", undefined, "empty");
  if (context.ledger.transactions.length) {
    empty.append(element("h2", "No matching transactions"), element("p", "Try changing the search or filters."));
  } else {
    empty.append(element("h2", "No transactions yet"), element("p", "Add a transaction or import a bank CSV to start your ledger."));
  }
  card.replaceChildren(empty);
}

/** Displays the latest committed transactions and their record actions. */
export function renderTransactions(parent: HTMLElement, context: ViewContext): void {
  const heading = element("header", undefined, "screen-heading");
  heading.dataset.geo = "transactions-heading";
  const title = element("h1", "Transactions");
  title.id = "screen-title";
  const card = element("section", undefined, "card ledger-card");
  card.dataset.geo = "transaction-list";
  if (typeof activeFilters.category === "string" && !context.ledger.categories.includes(activeFilters.category)) {
    activeFilters = { ...activeFilters, category: undefined };
  }
  let exporting = false;
  let exportable = false;
  const exportButton = command("Export CSV", () => {
    if (exporting || !exportable || context.mutationPending()) return;
    exportButton.disabled = exporting = true;
    void context.backend.exportCsv(activeFilters).then((receipt) => {
      if (receipt) {
        const noun = receipt.count === 1 ? " transaction" : " transactions";
        context.announce("Exported " + receipt.count + noun + " to " + receipt.name + ".");
      }
    }).catch(context.report).finally(() => {
      exporting = false;
      exportButton.disabled = !exportable;
    });
  });
  const show = (filters: TransactionFilter): void => {
    const rows = filterTransactions(context.ledger.transactions, filters);
    activeFilters = filters;
    exportable = rows.length > 0;
    exportButton.disabled = exporting || !exportable;
    showRows(card, context, rows);
  };
  const toolbar = filtersPanel(context.ledger, activeFilters, show, () => { exportable = false; exportButton.disabled = true; });
  const actions = element("div", undefined, "header-actions");
  actions.append(exportButton, command("Add transaction", () => openTransactionEditor(context), "primary"));
  heading.append(title, actions);
  show(activeFilters);
  parent.append(heading, toolbar, card);
}
