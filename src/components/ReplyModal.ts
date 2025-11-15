/**
 * Reply Modal Component
 * Displays AI-generated reply with edit, copy, and insert options
 */
export class ReplyModal {
  private element: HTMLElement;
  private shadowRoot: ShadowRoot;
  private actionCallback?: (action: string, text: string) => void;

  constructor() {
    this.element = document.createElement("div");
    this.element.className = "ai-reply-modal-container";

    // Create shadow DOM for style isolation
    this.shadowRoot = this.element.attachShadow({ mode: "open" });

    // Render the modal structure
    this.render();

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Renders the modal HTML structure and styles
   */
  private render(): void {
    this.shadowRoot.innerHTML = `
      <style>
        * {
          box-sizing: border-box;
        }

        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999999;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .ai-reply-modal {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 28px;
          color: #6b7280;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: #f3f4f6;
          color: #1f2937;
        }

        .modal-body {
          padding: 24px;
          flex: 1;
          overflow-y: auto;
        }

        .reply-text {
          width: 100%;
          min-height: 150px;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.5;
          resize: vertical;
          transition: border-color 0.2s ease;
        }

        .reply-text:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .usage-info {
          margin-top: 12px;
          font-size: 13px;
          color: #6b7280;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .usage-count {
          font-weight: 600;
          color: #667eea;
        }

        .modal-footer {
          display: flex;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid #e5e7eb;
          justify-content: flex-end;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn:active {
          transform: translateY(0);
        }

        .error-message {
          margin-top: 12px;
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #991b1b;
          font-size: 13px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .hidden {
          display: none;
        }
      </style>

      <div class="modal-backdrop">
        <div class="ai-reply-modal" role="dialog" aria-labelledby="modal-title" aria-modal="true">
          <div class="modal-header">
            <h3 id="modal-title" class="modal-title">AI Generated Reply</h3>
            <button class="close-btn" aria-label="Close" data-action="close">&times;</button>
          </div>
          <div class="modal-body">
            <textarea class="reply-text" aria-label="Generated reply text" placeholder="Your AI-generated reply will appear here..."></textarea>
            <div class="usage-info">Usage: <span class="usage-count">0</span>/<span class="usage-limit">50</span></div>
            <div class="error-message hidden"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="copy">Copy</button>
            <button class="btn btn-primary" data-action="insert">Insert</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Sets up event listeners for modal interactions
   */
  private setupEventListeners(): void {
    // Close button
    const closeBtn = this.shadowRoot.querySelector('[data-action="close"]');
    closeBtn?.addEventListener("click", () => this.hide());

    // Backdrop click to close
    const backdrop = this.shadowRoot.querySelector(".modal-backdrop");
    backdrop?.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        this.hide();
      }
    });

    // Action buttons (copy, insert)
    const actionButtons = this.shadowRoot.querySelectorAll("[data-action]");
    actionButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = (e.target as HTMLElement).getAttribute("data-action");
        if (action && action !== "close" && this.actionCallback) {
          const textarea = this.shadowRoot.querySelector(
            ".reply-text"
          ) as HTMLTextAreaElement;
          const text = textarea?.value || "";
          this.actionCallback(action, text);
        }
      });
    });

    // Escape key to close
    document.addEventListener("keydown", this.handleKeyDown);
  }

  /**
   * Handles keyboard events
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      this.hide();
    }
  };

  /**
   * Shows the modal with reply text and usage count
   */
  public show(
    reply: string,
    usageCount: number,
    usageLimit: number = 50,
    targetElement?: HTMLElement
  ): void {
    // Set reply text
    const textarea = this.shadowRoot.querySelector(
      ".reply-text"
    ) as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = reply;
    }

    // Set usage count
    const usageCountEl = this.shadowRoot.querySelector(".usage-count");
    if (usageCountEl) {
      usageCountEl.textContent = usageCount.toString();
    }

    // Set usage limit
    const usageLimitEl = this.shadowRoot.querySelector(".usage-limit");
    if (usageLimitEl) {
      usageLimitEl.textContent = usageLimit.toString();
    }

    // Add to DOM
    document.body.appendChild(this.element);

    // Focus textarea after a short delay
    setTimeout(() => {
      textarea?.focus();
      textarea?.select();
    }, 100);
  }

  /**
   * Hides and removes the modal
   */
  public hide(): void {
    // Remove keyboard listener
    document.removeEventListener("keydown", this.handleKeyDown);

    // Remove from DOM
    this.element.remove();
  }

  /**
   * Shows an error message in the modal
   */
  public showError(message: string): void {
    const errorEl = this.shadowRoot.querySelector(".error-message");
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove("hidden");
    }
  }

  /**
   * Hides the error message
   */
  public hideError(): void {
    const errorEl = this.shadowRoot.querySelector(".error-message");
    if (errorEl) {
      errorEl.classList.add("hidden");
    }
  }

  /**
   * Registers a callback for action buttons (copy, insert)
   */
  public onAction(callback: (action: string, text: string) => void): void {
    this.actionCallback = callback;
  }

  /**
   * Gets the current text in the textarea
   */
  public getText(): string {
    const textarea = this.shadowRoot.querySelector(
      ".reply-text"
    ) as HTMLTextAreaElement;
    return textarea?.value || "";
  }

  /**
   * Sets the text in the textarea
   */
  public setText(text: string): void {
    const textarea = this.shadowRoot.querySelector(
      ".reply-text"
    ) as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = text;
    }
  }
}
