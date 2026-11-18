import type { Transaction, TransactionInput } from "../contracts/ledger";
import { minorAmountText, parseMinorAmount } from "../domain/money";
import { transactionLimits } from "../domain/transactions";
import { element, formText, required } from "./dom";
import type { ViewContext } from "./view-context";

function localToday(): string {
  const today = new Date();
  return [today.getFullYear(), today.getMonth() + 1, today.getDate()]
    .map((part) => String(part).padStart(2, "0")).join("-");
}

function draft(form: HTMLFormElement, currency: string, previous?: Transaction): TransactionInput {
  const fields = new FormData(form);
  return {
    id: previous?.id,
    date: formText(fields, "date"),
    payee: formText(fields, "payee"),
    amountMinor: parseMinorAmount(formText(fields, "amount"), currency),
    category: formText(fields, "category"),
    note: formText(fields, "note"),
  };
}

function bindEditor(form: HTMLFormElement, dialog: HTMLDialogElement, context: ViewContext, previous?: Transaction): void {
  const save = required<HTMLButtonElement>(form, "button[type=submit]");
  const deletion = required<HTMLButtonElement>(form, "[data-delete]");
  const error = required(form, "[role=alert]");
  const report = (problem: unknown): void => {
    error.textContent = problem instanceof Error ? problem.message : "Tally could not save the transaction.";
  };
  const run = (operation: () => Promise<void>): void => {
    save.disabled = true;
    deletion.disabled = true;
    error.textContent = "";
    void Promise.resolve().then(operation).then(() => dialog.close()).catch(report).finally(() => {
      save.disabled = false;
      deletion.disabled = false;
    });
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    run(() => context.commit(
      () => context.backend.saveTransaction(draft(form, context.ledger.currency, previous)),
      "Transaction saved.",
    ));
  });
  required(form, "[data-cancel]").addEventListener("click", () => dialog.close());
  if (!previous) deletion.remove();
  else deletion.addEventListener("click", () => {
    if (window.confirm("Delete the transaction for " + previous.payee + "?")) {
      run(() => context.commit(() => context.backend.deleteTransaction(previous.id), "Transaction deleted."));
    }
  });
}

/** Opens an accessible editor for a new or previously committed transaction. */
export function openTransactionEditor(context: ViewContext, previous?: Transaction): void {
  const dialog = element("dialog", undefined, "transaction-editor");
  dialog.setAttribute("aria-labelledby", "editor-title");
  dialog.innerHTML = `
    <form>
      <h2 id="editor-title"></h2>
      <div class="fields-pair">
        <label>Date <input name="date" type="date" required></label>
        <label>Amount <input name="amount" inputmode="decimal" aria-describedby="amount-hint" required></label>
      </div>
      <p class="hint" id="amount-hint">Use a minus sign for spending.</p>
      <label>Payee <input name="payee" required autofocus></label>
      <label>Category <input name="category" placeholder="Optional"></label>
      <label>Note <textarea name="note" rows="2" placeholder="Optional"></textarea></label>
      <p class="inline-error" role="alert"></p>
      <div class="dialog-actions">
        <button data-delete type="button" class="danger">Delete transaction</button>
        <span class="spacer"></span>
        <button data-cancel type="button">Cancel</button>
        <button type="submit" class="primary">Save transaction</button>
      </div>
    </form>`;
  const form = required<HTMLFormElement>(dialog, "form");
  required(dialog, "#editor-title").textContent = previous ? "Edit transaction" : "Add transaction";
  required<HTMLInputElement>(form, "[name=date]").value = previous?.date ?? localToday();
  const amount = required<HTMLInputElement>(form, "[name=amount]");
  amount.value = previous ? minorAmountText(previous.amountMinor, context.ledger.currency) : "";
  amount.placeholder = "0.00 " + context.ledger.currency;
  for (const field of ["payee", "category", "note"] as const) {
    const input = required<HTMLInputElement | HTMLTextAreaElement>(form, "[name=" + field + "]");
    input.maxLength = transactionLimits[field];
    input.value = previous?.[field] ?? "";
  }
  if (context.ledger.categories.length) {
    const suggestions = element("datalist");
    suggestions.id = "category-suggestions";
    for (const category of context.ledger.categories) suggestions.append(new Option(category));
    required(form, "[name=category]").setAttribute("list", suggestions.id);
    form.append(suggestions);
  }
  bindEditor(form, dialog, context, previous);
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
}
