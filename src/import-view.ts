import { dateOrders, type CsvDelimiter, type CsvMapping, type ImportRequest, type ImportSource } from "../contracts/import";
import { command, element, formText, selectField } from "./dom";
import { renderImportPreview } from "./import-preview";
import type { ViewContext } from "./view-context";

const delimiters: Record<CsvDelimiter, string> = { ",": "Comma", ";": "Semicolon", "\t": "Tab", "|": "Pipe" };
const orderLabels = { YMD: "Year / month / day", DMY: "Day / month / year", MDY: "Month / day / year" };

function readMapping(form: HTMLFormElement): CsvMapping {
  const data = new FormData(form);
  const order = formText(data, "order");
  const dateOrder = dateOrders.find((candidate) => candidate === order);
  if (!dateOrder) throw new Error("Choose a date order.");
  const column = (name: string): number => Number(formText(data, name));
  return {
    date: column("date"), payee: column("payee"), dateOrder,
    amount: formText(data, "mode") === "split"
      ? { kind: "split", debit: column("debit"), credit: column("credit") }
      : { kind: "signed", column: column("amount") },
  };
}

function mappingControls(source: ImportSource): HTMLFormElement {
  const form = element("form", undefined, "mapping-fields");
  const options = source.columns.map((label, index) => [String(index), label] as const);
  const mapping = source.suggested;
  const mode = selectField("Amount format", "mode", [["signed", "Signed amount"], ["split", "Debit and credit"]], mapping.amount.kind);
  const signed = selectField("Amount column", "amount", options, String(mapping.amount.kind === "signed" ? mapping.amount.column : 2));
  const debit = selectField("Debit column", "debit", options, String(mapping.amount.kind === "split" ? mapping.amount.debit : 2));
  const credit = selectField("Credit column", "credit", options, String(mapping.amount.kind === "split" ? mapping.amount.credit : 3));
  const showMode = (): void => {
    const split = formText(new FormData(form), "mode") === "split";
    signed.hidden = split;
    debit.hidden = !split;
    credit.hidden = !split;
  };
  form.append(
    selectField("Date column", "date", options, String(mapping.date)),
    selectField("Payee column", "payee", options, String(mapping.payee)),
    selectField("Date order", "order", dateOrders.map((order) => [order, orderLabels[order]]), mapping.dateOrder),
    mode, signed, debit, credit,
  );
  showMode();
  mode.addEventListener("change", showMode);
  return form;
}

function report(error: HTMLElement, problem: unknown): void {
  error.textContent = problem instanceof Error ? problem.message : "The CSV could not be imported.";
}

function withFeedback(button: HTMLButtonElement, error: HTMLElement, action: () => Promise<void>): void {
  button.disabled = true;
  error.textContent = "";
  void action().catch((problem: unknown) => report(error, problem)).finally(() => { button.disabled = false; });
}

function mapFile(parent: HTMLElement, source: ImportSource, context: ViewContext): void {
  const form = mappingControls(source);
  const error = element("p", undefined, "inline-error");
  error.setAttribute("role", "alert");
  const preview = element("section", undefined, "import-preview");
  let revision = 0;
  const inspect = element("button", "Preview import");
  inspect.type = "submit";
  form.append(inspect);
  form.addEventListener("change", () => {
    revision++;
    preview.replaceChildren();
    error.textContent = "";
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const inspectedRevision = revision;
    withFeedback(inspect, error, async () => {
      const request: ImportRequest = { token: source.token, mapping: readMapping(form) };
      const review = await context.backend.previewImport(request);
      if (revision !== inspectedRevision) return;
      renderImportPreview(preview, review, (button) => {
        withFeedback(button, error, async () => {
          const receipt = await context.backend.confirmImport(request);
          const noun = receipt.imported === 1 ? " transaction" : " transactions";
          const message = "Imported " + receipt.imported + noun + ". " +
            receipt.duplicateCount + " duplicates skipped. " + receipt.rejections.length + " rejected.";
          await context.commit(async () => receipt.ledger, message);
        });
      });
    });
  });
  parent.replaceChildren(
    element("h2", source.name),
    element("p", delimiters[source.delimiter] + " delimiter", "hint"),
    element("p", "Header on line " + source.headerLine, "hint"),
    form, preview, error,
  );
}

/** Displays native selection, column mapping, preview and confirmation for one CSV. */
export function renderImport(parent: HTMLElement, context: ViewContext): void {
  const heading = element("header", undefined, "screen-heading");
  const title = element("h1", "Import CSV");
  title.id = "screen-title";
  const panel = element("section", undefined, "card csv-panel");
  const error = element("p", undefined, "inline-error");
  error.setAttribute("role", "alert");
  const choose = command("Choose CSV", () => {
    withFeedback(choose, error, async () => {
      const source = await context.backend.chooseImportFile();
      if (source) mapFile(panel, source, context);
    });
  }, "primary");
  heading.append(title, choose);
  panel.append(element("p", "Choose a bank CSV to map its columns and review the transactions."));
  parent.append(heading, panel, error);
}
