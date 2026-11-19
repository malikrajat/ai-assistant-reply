const SPARKLE_ICON = `
  <svg class="ai-reply-btn__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M8 0L9.5 5.5L15 7L9.5 8.5L8 14L6.5 8.5L1 7L6.5 5.5L8 0Z" fill="currentColor"/>
    <path d="M13 2L13.5 4L15.5 4.5L13.5 5L13 7L12.5 5L10.5 4.5L12.5 4L13 2Z" fill="currentColor"/>
  </svg>`;

const SPINNER_ICON = `
  <svg class="ai-reply-btn__spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="30 10" opacity="0.5"/>
  </svg>`;

type ButtonState = "idle" | "loading";

/**
 * Applies the right markup for a button variant (inline pill vs floating circle).
 */
function renderButtonContent(button: HTMLButtonElement, state: ButtonState): void {
  const variant = button.dataset.aiVariant || "inline";
  const label = button.dataset.aiLabel || "AI Reply";

  if (state === "loading") {
    button.innerHTML =
      variant === "floating"
        ? SPINNER_ICON
        : `${SPINNER_ICON}<span class="ai-reply-btn__text">Generating...</span>`;
    return;
  }

  button.innerHTML =
    variant === "floating"
      ? SPARKLE_ICON
      : `${SPARKLE_ICON}<span class="ai-reply-btn__text">${label}</span>`;
}

/**
 * Creates an inline AI reply button for a composer.
 */
export function createButton(label = "AI Reply"): HTMLButtonElement {
  const button = document.createElement("button");

  button.className = "ai-reply-btn";
  button.dataset.aiVariant = "inline";
  button.dataset.aiLabel = label;

  button.setAttribute("type", "button");
  button.setAttribute("aria-label", `${label} (Alt+Shift+G)`);
  button.setAttribute("title", `${label} - generate with AI (Alt+Shift+G)`);

  renderButtonContent(button, "idle");

  return button;
}

/**
 * Creates the small circular button that follows the focused text box, so the
 * assistant is one click away on any composer LinkedIn renders.
 */
export function createFloatingButton(): HTMLButtonElement {
  const button = document.createElement("button");

  button.className = "ai-reply-btn ai-reply-float-btn";
  button.dataset.aiVariant = "floating";
  button.dataset.aiLabel = "AI Reply";

  button.setAttribute("type", "button");
  button.setAttribute("aria-label", "Generate AI reply (Alt+Shift+G)");
  button.setAttribute("title", "Generate AI reply (Alt+Shift+G)");

  renderButtonContent(button, "idle");

  return button;
}

/**
 * Checks if a button has already been injected into a composer container
 */
export function isButtonAlreadyInjected(container: HTMLElement): boolean {
  return container.querySelector(".ai-reply-btn") !== null;
}

/**
 * Sets button loading state
 */
export function setButtonLoading(button: HTMLButtonElement, loading: boolean): void {
  if (loading) {
    button.disabled = true;
    button.classList.add("ai-reply-btn--loading");
    button.setAttribute("aria-busy", "true");
    renderButtonContent(button, "loading");
  } else {
    button.disabled = false;
    button.classList.remove("ai-reply-btn--loading");
    button.removeAttribute("aria-busy");
    renderButtonContent(button, "idle");
  }
}

/**
 * Sets button error state
 */
export function setButtonError(button: HTMLButtonElement, error: boolean): void {
  if (error) {
    button.classList.add("ai-reply-btn--error");
    setTimeout(() => {
      button.classList.remove("ai-reply-btn--error");
    }, 2000);
  } else {
    button.classList.remove("ai-reply-btn--error");
  }
}

/**
 * Sets button success state
 */
export function setButtonSuccess(button: HTMLButtonElement): void {
  button.classList.add("ai-reply-btn--success");
  setTimeout(() => {
    button.classList.remove("ai-reply-btn--success");
  }, 1000);
}
