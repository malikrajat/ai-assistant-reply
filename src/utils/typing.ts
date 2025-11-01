/**
 * Typing simulation utilities to make text insertion appear more natural
 */

/**
 * Simulates human typing by inserting text character by character with realistic delays
 */
export async function simulateTyping(
  element: HTMLElement,
  text: string,
  options: {
    minDelay?: number;
    maxDelay?: number;
    initialDelay?: number;
  } = {}
): Promise<void> {
  const {
    minDelay = 30, // Minimum delay between characters (ms)
    maxDelay = 100, // Maximum delay between characters (ms)
    initialDelay = 200, // Delay before starting to type (ms)
  } = options;

  // Wait before starting to type (simulates thinking time)
  await sleep(initialDelay);

  // Clear existing content
  element.textContent = "";
  element.focus();

  // Fire focus event
  fireEvent(element, "focus");

  // Type each character
  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Insert character
    element.textContent += char;

    // Fire input events
    fireInputEvents(element, element.textContent);

    // Random delay between characters (simulates human typing speed variation)
    const delay = getRandomDelay(minDelay, maxDelay);
    await sleep(delay);

    // Occasionally add longer pauses (simulates thinking/reading)
    if (shouldPause(i, text)) {
      await sleep(getRandomDelay(200, 500));
    }
  }

  // Fire final change event
  fireEvent(element, "change");
  fireEvent(element, "blur");
}

/**
 * Fires proper DOM events that LinkedIn expects
 */
function fireInputEvents(element: HTMLElement, value: string): void {
  // Input event (fired during typing)
  fireEvent(element, "input", {
    bubbles: true,
    cancelable: true,
    data: value,
    inputType: "insertText",
  });

  // KeyUp event
  fireEvent(element, "keyup", {
    bubbles: true,
    cancelable: true,
  });
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
 * Returns a random delay between min and max
 */
function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Determines if we should add a pause (simulates thinking/reading)
 */
function shouldPause(index: number, text: string): boolean {
  const char = text[index];

  // Pause after punctuation
  if ([",", ".", "!", "?", ";", ":"].includes(char)) {
    return Math.random() > 0.5; // 50% chance to pause after punctuation
  }

  // Pause after spaces occasionally
  if (char === " " && Math.random() > 0.9) {
    return true; // 10% chance to pause after space
  }

  return false;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fast insert mode - inserts text instantly but still fires proper events
 */
export function fastInsert(element: HTMLElement, text: string): void {
  element.textContent = text;
  element.focus();

  // Fire all necessary events
  fireEvent(element, "focus");
  fireInputEvents(element, text);
  fireEvent(element, "change");
  fireEvent(element, "blur");
}
