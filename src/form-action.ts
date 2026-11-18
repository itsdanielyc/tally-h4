import { element } from "./dom";

/** Connects a form to an action and keeps repeat submissions blocked while it is pending. */
export function submitAction(
  form: HTMLFormElement, label: string, action: (values: FormData) => Promise<void>,
  report: (error: unknown) => void, disabled = false,
): HTMLButtonElement {
  const button = element("button", label, "primary");
  button.type = "submit";
  button.disabled = disabled;
  form.append(button);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (button.disabled) return;
    button.disabled = true;
    const data = new FormData(form);
    void Promise.resolve().then(() => action(data)).catch(report).finally(() => { button.disabled = disabled; });
  });
  return button;
}
