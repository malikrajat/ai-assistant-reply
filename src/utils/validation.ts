import { UserSettings } from "../types/index.js";

/**
 * Validates user settings object
 * Throws error if validation fails
 */
export function validateSettings(settings: Partial<UserSettings>): void {
  // Validate API key
  if (settings.apiKey !== undefined) {
    if (typeof settings.apiKey !== "string") {
      throw new Error("API key must be a string");
    }
    // Allow empty string (user hasn't configured yet)
    if (settings.apiKey.length > 0 && settings.apiKey.length < 10) {
      throw new Error("API key appears to be invalid (too short)");
    }
  }

  // Validate tone
  if (settings.tone !== undefined) {
    const validTones = ["polite", "professional", "friendly", "concise"];
    if (!validTones.includes(settings.tone)) {
      throw new Error(
        `Invalid tone. Must be one of: ${validTones.join(", ")}`
      );
    }
  }

  // Validate max length
  if (settings.maxLength !== undefined) {
    if (typeof settings.maxLength !== "number" || isNaN(settings.maxLength)) {
      throw new Error("Max length must be a number");
    }
    if (settings.maxLength < 100 || settings.maxLength > 1000) {
      throw new Error("Max length must be between 100 and 1000 characters");
    }
  }

  // Validate default action
  if (settings.defaultAction !== undefined) {
    const validActions = ["insert", "copy"];
    if (!validActions.includes(settings.defaultAction)) {
      throw new Error(
        `Invalid default action. Must be one of: ${validActions.join(", ")}`
      );
    }
  }

  // Validate rate limit
  if (settings.rateLimit !== undefined) {
    if (typeof settings.rateLimit !== "number" || isNaN(settings.rateLimit)) {
      throw new Error("Rate limit must be a number");
    }
    if (settings.rateLimit < 1 || settings.rateLimit > 10000) {
      throw new Error("Rate limit must be between 1 and 10000");
    }
  }
}

/**
 * Validates and sanitizes API key
 */
export function validateApiKey(apiKey: string): string {
  // Trim whitespace
  const trimmed = apiKey.trim();

  // Check if empty
  if (trimmed.length === 0) {
    throw new Error("API key cannot be empty");
  }

  // Check minimum length
  if (trimmed.length < 10) {
    throw new Error("API key appears to be invalid (too short)");
  }

  // Remove any potential injection characters
  const sanitized = trimmed.replace(/[<>'"]/g, "");

  return sanitized;
}

/**
 * Validates post text before processing
 */
export function validatePostText(text: string): void {
  if (!text || typeof text !== "string") {
    throw new Error("Post text must be a non-empty string");
  }

  const trimmed = text.trim();

  if (trimmed.length === 0) {
    throw new Error("Post text cannot be empty");
  }

  if (trimmed.length < 5) {
    throw new Error("Post text is too short (minimum 5 characters)");
  }

  if (trimmed.length > 10000) {
    throw new Error("Post text is too long (maximum 10000 characters)");
  }
}

/**
 * Sanitizes HTML to prevent XSS attacks
 * Escapes HTML special characters
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Sanitizes text for safe display
 * Removes control characters and normalizes whitespace
 */
export function sanitizeText(text: string): string {
  // Remove control characters (except newlines and tabs)
  let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, " ");

  // Trim
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validates a number is within a range
 */
export function validateNumberInRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): void {
  if (typeof value !== "number" || isNaN(value)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (value < min || value > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
}

/**
 * Validates an email address format (basic validation)
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes user input for storage
 * Removes potentially dangerous characters
 */
export function sanitizeForStorage(input: string): string {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, "");

  // Limit length
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }

  return sanitized;
}
