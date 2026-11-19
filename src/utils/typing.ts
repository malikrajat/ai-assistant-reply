/**
 * Text insertion utilities.
 *
 * Everything here is statically imported into the content-script bundle on
 * purpose. A content script cannot fetch a separate extension chunk at runtime
 * (`import("./typing.js")` is blocked unless the file is web-accessible), which
 * is why "Insert" used to fail while "Copy" kept working.
 */

export interface TypingOptions {
  minDelay?: number;
  maxDelay?: number;
  initialDelay?: number;
  maxDuration?: number;
  simulate?: boolean;
}

function readText(element: HTMLElement): string {
  if (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLInputElement
  ) {
    return element.value || "";
  }
  return element.innerText || element.textContent || "";
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * True when the text we asked for is actually in the editor.
 */
export function verifyInsertion(element: HTMLElement, text: string): boolean {
  const expected = normalize(text).slice(0, 30).toLowerCase();
  if (!expected) return true;
  return normalize(readText(element)).toLowerCase().includes(expected);
}

/**
 * Fires a DOM event on an element
 */
function fireEvent(
  element: HTMLElement,
  eventType: string,
  options: any = {}
): void {
  let event: Event;

  if (eventType === "input") {
    event = new InputEvent(eventType, {
      bubbles: true,
      cancelable: true,
      ...options,
    });
  } else if (eventType === "keyup" || eventType === "keydown") {
    event = new KeyboardEvent(eventType, {
      bubbles: true,
      cancelable: true,
      ...options,
    });
  } else {
    event = new Event(eventType, {
      bubbles: true,
      cancelable: true,
      ...options,
    });
  }

  element.dispatchEvent(event);
}

/**
 * Fires the input events rich-text editors listen for.
 */
function fireInputEvents(element: HTMLElement, value: string): void {
  fireEvent(element, "input", {
    bubbles: true,
    cancelable: true,
    data: value,
    inputType: "insertText",
  });

  fireEvent(element, "keyup", {
    bubbles: true,
    cancelable: true,
  });
}

/**
 * Returns a random delay between min and max
 */
function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Spreads typing delays across chunks, scaling them down so a long reply still
 * finishes quickly.
 */
function buildDelays(
  count: number,
  minDelay: number,
  maxDelay: number,
  initialDelay: number,
  maxDuration: number
): number[] {
  let delays = Array.from({ length: count }, () =>
    getRandomDelay(minDelay, maxDelay)
  );

  const total = delays.reduce((sum, delay) => sum + delay, 0);
  const budget = Math.max(200, maxDuration - initialDelay);

  if (total > budget) {
    const scale = budget / total;
    delays = delays.map((delay) => Math.max(1, Math.round(delay * scale)));
  }

  return delays;
}

/**
 * Selects the whole content of an editable so the next insert replaces it.
 */
function selectAllContents(element: HTMLElement): void {
  try {
    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
  } catch (error) {
    console.warn("[Typing] Could not select editor contents:", error);
  }
}

/**
 * Inserts text through the browser's native command. This is the reliable path
 * for rich text editors (LinkedIn's Quill/React editors included) because it
 * fires the real beforeinput/input events they subscribe to.
 */
function execInsertText(text: string): boolean {
  try {
    if (typeof document.execCommand !== "function") return false;
    return document.execCommand("insertText", false, text) !== false;
  } catch (error) {
    console.warn("[Typing] execCommand insertText failed:", error);
    return false;
  }
}

/**
 * Writes text straight to the DOM and fires the matching events.
 */
async function writeViaDom(
  element: HTMLElement,
  chunks: string[],
  delays: number[],
  simulate: boolean
): Promise<void> {
  element.textContent = "";
  element.focus();
  fireEvent(element, "focus");

  let written = "";
  for (let i = 0; i < chunks.length; i++) {
    written += chunks[i];
    element.textContent = written;
    fireInputEvents(element, written);
    if (simulate) await sleep(delays[i] ?? 8);
  }
}

/**
 * Puts text into a contenteditable editor, replacing whatever was there.
 *
 * Order of preference:
 *  1. native `insertText` command (works with Quill/Draft.js/React editors)
 *  2. direct DOM write + synthesized input events
 *
 * Returns false only when neither path actually changed the editor, so the UI
 * can tell the user instead of failing silently.
 */
export async function insertIntoContentEditable(
  element: HTMLElement,
  text: string,
  options: TypingOptions = {}
): Promise<boolean> {
  const {
    minDelay = 8,
    maxDelay = 22,
    initialDelay = 120,
    maxDuration = 4000,
    simulate = true,
  } = options;

  if (!element.isConnected) {
    console.warn("[Typing] Editor is no longer in the DOM, skipping insert");
    return false;
  }

  const chunks = simulate
    ? text.match(/\S+\s*/g) ?? (text ? [text] : [])
    : [text];
  const delays = buildDelays(
    chunks.length,
    minDelay,
    maxDelay,
    initialDelay,
    maxDuration
  );

  element.focus();
  fireEvent(element, "focus");

  if (simulate) {
    await sleep(Math.min(initialDelay, maxDuration));
  }

  // Preferred path: native command, typing chunk by chunk.
  element.focus();
  selectAllContents(element);
  execInsertText(""); // replace any existing draft

  let usedNativePath = true;
  for (let i = 0; i < chunks.length; i++) {
    if (!execInsertText(chunks[i])) {
      usedNativePath = false;
      break;
    }
    if (simulate) await sleep(delays[i] ?? minDelay);
  }

  if (usedNativePath && verifyInsertion(element, text)) {
    fireEvent(element, "change");
    return true;
  }

  // Fallback: write to the DOM ourselves.
  await writeViaDom(element, chunks, delays, simulate);
  fireEvent(element, "change");

  const inserted = verifyInsertion(element, text);
  if (!inserted) {
    console.warn("[Typing] Could not confirm the text landed in the editor");
  }
  return inserted;
}

/**
 * Sets the value of a textarea/input while keeping framework state in sync.
 */
export function insertTextIntoFormControl(
  element: HTMLTextAreaElement | HTMLInputElement,
  text: string
): boolean {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (setter) {
    setter.call(element, text);
  } else {
    element.value = text;
  }

  element.focus();
  fireInputEvents(element, text);
  fireEvent(element, "change");

  return element.value === text;
}

/**
 * Simulates human typing by inserting text in word-sized chunks.
 */
export async function simulateTyping(
  element: HTMLElement,
  text: string,
  options: TypingOptions = {}
): Promise<void> {
  await insertIntoContentEditable(element, text, { ...options, simulate: true });
}

/**
 * Fast insert mode - inserts text instantly but still fires proper events
 */
export function fastInsert(element: HTMLElement, text: string): void {
  element.focus();
  selectAllContents(element);

  if (execInsertText(text) && verifyInsertion(element, text)) {
    fireEvent(element, "change");
    return;
  }

  element.textContent = text;
  fireInputEvents(element, text);
  fireEvent(element, "change");
}
