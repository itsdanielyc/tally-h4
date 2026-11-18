import type { ImportReview } from "../contracts/import";
import { formatMoney } from "../domain/money";
import { command, element } from "./dom";

function previewTable(review: ImportReview): HTMLTableElement {
  const table = element("table");
  table.setAttribute("aria-label", "Import preview");
  const headings = table.createTHead().insertRow();
  for (const name of ["Date", "Payee", "Amount"]) {
    const cell = element("th", name);
    cell.scope = "col";
    headings.append(cell);
  }
  const rows = table.createTBody();
  for (const item of review.preview) {
    rows.insertRow().append(
      element("td", item.date),
      element("td", item.payee),
      element("td", formatMoney(item.amountMinor, review.currency), "amount"),
    );
  }
  return table;
}

/** Exposes every rejected row alongside counts and the first accepted transactions. */
export function renderImportPreview(
  parent: HTMLElement, review: ImportReview, confirm: (button: HTMLButtonElement) => void,
): void {
  parent.replaceChildren();
  parent.append(element("h2", "Preview"));
  const counts = element("div", undefined, "import-counts");
  counts.append(
    element("span", review.acceptedCount + " ready"),
    element("span", review.duplicateCount + (review.duplicateCount === 1 ? " duplicate" : " duplicates")),
    element("span", review.rejections.length + " rejected"),
  );
  parent.append(counts);
  if (review.preview.length) {
    const table = element("div", undefined, "table-wrap");
    table.append(previewTable(review));
    parent.append(table);
  }
  if (review.rejections.length) {
    const rejects = element("details", undefined, "reject-list");
    rejects.open = true;
    rejects.append(element("summary", "Rejected rows"));
    const items = element("ul");
    for (const rejected of review.rejections) items.append(element("li", "Line " + rejected.line + ": " + rejected.reason));
    rejects.append(items);
    parent.append(rejects);
  }
  const label = "Import " + review.acceptedCount + (review.acceptedCount === 1 ? " transaction" : " transactions");
  const button = command(label, () => confirm(button), "primary");
  button.disabled = !review.acceptedCount;
  parent.append(button);
}
