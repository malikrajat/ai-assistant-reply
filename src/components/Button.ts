/**
 * Creates an AI reply button element
 * Returns a styled button with icon and text
 */
export function createButton(): HTMLButtonElement {
  const button = document.createElement("button");

  // Add classes for styling
  button.className = "ai-reply-btn";

  // Add ARIA attributes for accessibility
  button.setAttribute("type", "button");
  button.setAttribute("aria-label", "Generate AI reply suggestion");
  button.setAttribute("title", "Generate AI reply suggestion");

  // Add button content with sparkle icon
  button.innerHTML = `
    <svg class="ai-reply-btn__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 0L9.5 5.5L15 7L9.5 8.5L8 14L6.5 8.5L1 7L6.5 5.5L8 0Z" fill="currentColor"/>
      <path d="M13 2L13.5 4L15.5 4.5L13.5 5L13 7L12.5 5L10.5 4.5L12.5 4L13 2Z" fill="currentColor"/>
    </svg>
    <span class="ai-reply-btn__text">AI Reply</span>
  `;

  return button;
}

/**
 * Checks if a button has already been injected into a comment box
 */
export function isButtonAlreadyInjected(commentBox: HTMLElement): boolean {
  return commentBox.querySelector(".ai-reply-btn") !== null;
}

/**
 * Sets button loading state
 */
export function setButtonLoading(button: HTMLButtonElement, loading: boolean): void {
  if (loading) {
    button.disabled = true;
    button.classList.add("ai-reply-btn--loading");
    button.setAttribute("aria-busy", "true");

    // Replace content with loading spinner
    button.innerHTML = `
      <svg class="ai-reply-btn__spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="30 10" opacity="0.5"/>
      </svg>
      <span class="ai-reply-btn__text">Generating...</span>
    `;
  } else {
    button.disabled = false;
    button.classList.remove("ai-reply-btn--loading");
    button.removeAttribute("aria-busy");

    // Restore original content
    button.innerHTML = `
      <svg class="ai-reply-btn__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 0L9.5 5.5L15 7L9.5 8.5L8 14L6.5 8.5L1 7L6.5 5.5L8 0Z" fill="currentColor"/>
        <path d="M13 2L13.5 4L15.5 4.5L13.5 5L13 7L12.5 5L10.5 4.5L12.5 4L13 2Z" fill="currentColor"/>
      </svg>
      <span class="ai-reply-btn__text">AI Reply</span>
    `;
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
