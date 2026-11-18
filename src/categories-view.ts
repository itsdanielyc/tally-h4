import { transactionLimits } from "../domain/transactions";
import { command, element, formText, selectField, textField } from "./dom";
import { submitAction } from "./form-action";
import type { ViewContext } from "./view-context";

type CategoryOptions = readonly (readonly [string, string])[];

function openRename(context: ViewContext, from: string): void {
  const dialog = element("dialog");
  dialog.setAttribute("aria-labelledby", "rename-title");
  const title = element("h2", "Rename category");
  title.id = "rename-title";
  const form = element("form");
  const actions = element("div", undefined, "dialog-actions");
  const error = element("p", undefined, "inline-error");
  error.setAttribute("role", "alert");
  form.append(title, textField("New name", "name", transactionLimits.category, from), error, actions);
  actions.append(command("Cancel", () => dialog.close()));
  const save = submitAction(form, "Save name", async (values) => {
    await context.commit(() => context.backend.renameCategory({ from, to: formText(values, "name") }), "Category renamed.");
    dialog.close();
  }, (problem) => {
    error.textContent = problem instanceof Error ? problem.message : "The category could not be renamed.";
  });
  actions.append(save);
  dialog.append(form);
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
}

function categoryList(context: ViewContext): HTMLElement {
  if (!context.ledger.categories.length) return element("p", "No categories yet.", "hint");
  const list = element("ul", undefined, "manage-list");
  for (const category of context.ledger.categories) {
    const item = element("li");
    const name = element("span", category, "item-name");
    const actions = element("div", undefined, "manage-actions");
    const rename = command("Rename", () => openRename(context, category));
    rename.setAttribute("aria-label", "Rename " + category);
    const deletion = command("Delete", () => {
      if (window.confirm("Delete " + category + "? Its transactions will become uncategorised and its rules will be removed.")) {
        void context.commit(() => context.backend.deleteCategory(category), "Category deleted.").catch(context.report);
      }
    }, "danger");
    deletion.setAttribute("aria-label", "Delete " + category);
    actions.append(rename, deletion);
    item.append(name, actions);
    list.append(item);
  }
  return list;
}

function mergeForm(options: CategoryOptions, context: ViewContext): HTMLFormElement {
  const merge = element("form", undefined, "management-form");
  const fields = element("div", undefined, "fields-pair");
  fields.append(
    selectField("Category to merge", "from", options, options[0][0]),
    selectField("Merge into", "to", options, options[1][0]),
  );
  merge.append(element("h3", "Merge categories"), fields);
  submitAction(merge, "Merge categories", async (values) => {
    const from = formText(values, "from");
    const to = formText(values, "to");
    if (from === to) throw new Error("Choose two different categories.");
    if (window.confirm("Merge " + from + " into " + to + "?")) {
      await context.commit(() => context.backend.mergeCategory({ from, to }), "Categories merged.");
    }
  }, context.report);
  return merge;
}

function categoryPanel(options: CategoryOptions, context: ViewContext): HTMLElement {
  const panel = element("section", undefined, "card management-panel");
  const create = element("form", undefined, "management-form");
  create.append(textField("Category name", "name", transactionLimits.category));
  submitAction(create, "Add category", (values) =>
    context.commit(() => context.backend.addCategory(formText(values, "name")), "Category added."), context.report);
  panel.append(element("h2", "Manage categories"), create, categoryList(context));
  if (options.length > 1) panel.append(mergeForm(options, context));
  return panel;
}

function ruleList(context: ViewContext): HTMLElement {
  if (!context.ledger.rules.length) return element("p", "No payee rules yet.", "hint");
  const list = element("ul", undefined, "manage-list");
  for (const rule of context.ledger.rules) {
    const row = element("li");
    const summary = element("div", undefined, "item-name");
    summary.append(element("span", rule.contains), element("span", rule.category, "category"));
    const deletion = command("Delete", () => {
      void context.commit(() => context.backend.deletePayeeRule(rule.id), "Rule deleted.").catch(context.report);
    }, "danger");
    deletion.setAttribute("aria-label", "Delete rule for " + rule.contains);
    row.append(summary, deletion);
    list.append(row);
  }
  return list;
}

function rulePanel(options: CategoryOptions, context: ViewContext): HTMLElement {
  const panel = element("section", undefined, "card management-panel");
  const controls = element("div", undefined, "panel-heading");
  const apply = command("Apply rules", () => {
    apply.disabled = true;
    void context.commit(() => context.backend.applyPayeeRules(), "Rules applied to uncategorised transactions.")
      .catch(context.report).finally(() => { apply.disabled = false; });
  });
  apply.disabled = !context.ledger.rules.length;
  controls.append(element("h2", "Payee rules"), apply);
  panel.append(controls);
  if (options.length) {
    const create = element("form", undefined, "management-form");
    create.append(
      textField("Payee contains", "contains", transactionLimits.payee),
      selectField("Use category", "category", options, options[0][0]),
    );
    submitAction(create, "Add rule", (values) => context.commit(
      () => context.backend.addPayeeRule({ contains: formText(values, "contains"), category: formText(values, "category") }),
      "Rule added.",
    ), context.report);
    panel.append(create);
  } else panel.append(element("p", "Create a category to add a rule.", "hint"));
  panel.append(ruleList(context));
  return panel;
}

/** Lets the user manage category references and ordered payee rules. */
export function renderCategories(parent: HTMLElement, context: ViewContext): void {
  const heading = element("header", undefined, "screen-heading");
  const title = element("h1", "Categories");
  title.id = "screen-title";
  heading.append(title);
  const columns = element("div", undefined, "management-columns");
  const options = context.ledger.categories.map((name) => [name, name] as const);
  columns.append(categoryPanel(options, context), rulePanel(options, context));
  parent.append(heading, columns);
}
