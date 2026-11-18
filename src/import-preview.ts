import type { ImportReview, RejectedRow } from "../contracts/import";
import { formatMoney } from "../domain/money";
import { command, element } from "./dom";

const REJECTIONS_PER_PAGE = 50;

function previewTable(review: ImportReview): HTMLTableElement {
  const table = element("table");
  table.setAttribute("aria-label", "Import preview");
  const headings = table.createTHead().insertRow();
  for (const name of ["Date", "Payee", "Category", "Amount"]) {
    const cell = element("th", name);
    cell.scope = "col";
    headings.append(cell);
  }
  const rows = table.createTBody();
  for (const item of review.preview) {
    rows.insertRow().append(
      element("td", item.date),
      element("td", item.payee),
      element("td", item.category || "Uncategorised"),
      element("td", formatMoney(item.amountMinor, review.currency), "amount"),
    );
  }
  return table;
}

function rejectedRows(rejections: readonly RejectedRow[]): HTMLDetailsElement {
  const details = element("details", undefined, "reject-list");
  details.open = true;
  const list = element("ul");
  const pageCount = Math.ceil(rejections.length / REJECTIONS_PER_PAGE);
  const pageNumber = element("span");
  let page = 0;
  const previous = command("Previous rejected rows", () => showPage(page - 1));
  const next = command("Next rejected rows", () => showPage(page + 1));
  const showPage = (selected: number): void => {
    page = selected;
    const first = page * REJECTIONS_PER_PAGE;
    list.replaceChildren();
    for (const rejected of rejections.slice(first, first + REJECTIONS_PER_PAGE)) {
      list.append(element("li", "Line " + rejected.line + ": " + rejected.reason));
    }
    list.scrollTop = 0;
    pageNumber.textContent = "Page " + (page + 1) + " of " + pageCount;
    previous.disabled = page === 0;
    next.disabled = page === pageCount - 1;
  };
  details.append(element("summary", "Rejected rows"), list);
  if (pageCount > 1) {
    const controls = element("div", undefined, "manage-actions");
    controls.append(previous, pageNumber, next);
    details.append(controls);
  }
  showPage(0);
  return details;
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
  if (review.rejections.length) parent.append(rejectedRows(review.rejections));
  const label = "Import " + review.acceptedCount + (review.acceptedCount === 1 ? " transaction" : " transactions");
  const button = command(label, () => confirm(button), "primary");
  button.disabled = !review.acceptedCount;
  parent.append(button);
}
