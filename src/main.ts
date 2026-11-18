import type { LedgerSnapshot } from "../contracts/ledger";
import { connectBackend, type Backend } from "./api";
import { renderCategories } from "./categories-view";
import { element, required } from "./dom";
import { renderImport } from "./import-view";
import { renderMonth } from "./month-view";
import { renderSettings } from "./settings-view";
import { renderTransactions } from "./transactions-view";
import type { ViewContext } from "./view-context";

const renderScreen = {
  transactions: renderTransactions, import: renderImport, categories: renderCategories,
  month: renderMonth, settings: renderSettings,
};
type Screen = keyof typeof renderScreen;

class App {
  private readonly view = required(document, "#view");
  private readonly notice = required(document, "#notice");
  private readonly error = required(document, "#error");
  private readonly undo = required<HTMLButtonElement>(document, "#undo");
  private readonly navigation = document.querySelectorAll<HTMLButtonElement>("nav button[data-screen]");
  private ledger?: LedgerSnapshot;
  private screen: Screen = "transactions";
  private writing = false;

  constructor(private readonly backend: Backend) {}

  async start(): Promise<void> {
    const badge = required(document, "#backend-badge");
    badge.textContent = this.backend.kind;
    badge.hidden = this.backend.kind === "native";
    for (const button of this.navigation) {
      button.addEventListener("click", () => this.navigate(button.dataset.screen));
    }
    this.undo.addEventListener("click", () => {
      const undo = this.ledger?.undo;
      if (!undo) return;
      void this.commit(() => this.backend.undoLast(undo.token), "Change undone.")
        .catch((error: unknown) => this.report(error));
    });
    this.ledger = await this.backend.loadLedger();
    this.render();
  }

  private announce(message: string): void {
    this.error.textContent = "";
    this.notice.textContent = message;
  }

  private report(error: unknown): void {
    this.error.textContent = error instanceof Error ? error.message : "The ledger is unavailable.";
  }

  private async commit(operation: () => Promise<LedgerSnapshot>, message: string | (() => string)): Promise<void> {
    if (this.writing) throw new Error("Wait for the current ledger change to finish.");
    this.writing = true;
    this.view.inert = true;
    this.undo.disabled = true;
    try {
      this.ledger = await operation();
      this.render();
      this.announce(typeof message === "string" ? message : message());
    } finally {
      this.writing = false;
      this.view.inert = false;
      this.undo.disabled = false;
    }
  }

  private navigate(screen?: string): void {
    if (!screen || !Object.hasOwn(renderScreen, screen)) return;
    this.screen = screen as Screen;
    this.notice.textContent = "";
    this.error.textContent = "";
    this.render();
  }

  private render(): void {
    if (!this.ledger) return;
    for (const button of this.navigation) {
      if (button.dataset.screen === this.screen) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    this.view.replaceChildren();
    this.undo.hidden = this.ledger.undo === undefined;
    if (this.ledger.undo) this.undo.textContent = "Undo " + this.ledger.undo.kind;
    const context: ViewContext = {
      backend: this.backend,
      ledger: this.ledger,
      commit: (operation, message) => this.commit(operation, message),
      mutationPending: () => this.writing,
      announce: (message) => this.announce(message),
      report: (error) => this.report(error),
    };
    renderScreen[this.screen](this.view, context);
  }
}

function reportStartup(error: unknown): void {
  const title = element("h1", "Ledger unavailable");
  title.id = "screen-title";
  required(document, "#view").replaceChildren(title);
  required(document, "#error").textContent = error instanceof Error ? error.message : "The ledger could not be opened.";
}

try {
  void new App(connectBackend()).start().catch(reportStartup);
} catch (error) {
  reportStartup(error);
}
