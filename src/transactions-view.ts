import type { Transaction } from "../contracts/ledger";
import { formatMoney } from "../domain/money";
import { command, element } from "./dom";
import { openTransactionEditor } from "./transaction-editor";
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

function transactionTable(context: ViewContext): HTMLElement {
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
  for (const transaction of context.ledger.transactions) rows.append(row(transaction, context));
  body.append(rows);
  const overflow = element("div", undefined, "table-wrap");
  overflow.append(table);
  return overflow;
}

/** Displays the latest committed transactions and their record actions. */
export function renderTransactions(parent: HTMLElement, context: ViewContext): void {
  const heading = element("header", undefined, "screen-heading");
  heading.dataset.geo = "transactions-heading";
  const title = element("h1", "Transactions");
  title.id = "screen-title";
  heading.append(title, command("Add transaction", () => openTransactionEditor(context), "primary"));
  const card = element("section", undefined, "card ledger-card");
  card.dataset.geo = "transaction-list";
  if (context.ledger.transactions.length) card.append(transactionTable(context));
  else {
    const empty = element("div", undefined, "empty");
    empty.append(
      element("h2", "No transactions yet"),
      element("p", "Add a transaction to start your ledger."),
    );
    card.append(empty);
  }
  parent.append(heading, card);
}
