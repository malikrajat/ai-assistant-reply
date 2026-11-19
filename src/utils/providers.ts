/**
 * Supported LLM providers.
 *
 * This module deliberately has no imports so it can be used by the settings
 * types without creating a module cycle.
 *
 * `kind` decides the request shape:
 *   "gemini"     - Google generateContent API
 *   "anthropic"  - Anthropic Messages API
 *   "openai"     - any OpenAI-compatible /chat/completions endpoint
 */

export interface ProviderDefinition {
  id: string;
  label: string;
  kind: "gemini" | "anthropic" | "openai";
  baseUrl: string;
  defaultModel: string;
  suggestedModels: string[];
  keyUrl: string;
  keyHint: string;
  allowEmptyKey?: boolean;
}

export const LLM_PROVIDERS: ProviderDefinition[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    kind: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.5-flash",
    suggestedModels: [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
    ],
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyHint: "Starts with AIza...",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    kind: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    suggestedModels: ["deepseek-chat", "deepseek-reasoner"],
    keyUrl: "https://platform.deepseek.com/api_keys",
    keyHint: "Starts with sk-...",
  },
  {
    id: "openai",
    label: "OpenAI",
    kind: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    suggestedModels: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
    keyUrl: "https://platform.openai.com/api-keys",
    keyHint: "Starts with sk-...",
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    kind: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-sonnet-latest",
    suggestedModels: [
      "claude-3-5-sonnet-latest",
      "claude-3-5-haiku-latest",
      "claude-3-7-sonnet-latest",
    ],
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "Starts with sk-ant-...",
  },
  {
    id: "groq",
    label: "Groq (fast open models)",
    kind: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    suggestedModels: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
    ],
    keyUrl: "https://console.groq.com/keys",
    keyHint: "Starts with gsk_...",
  },
  {
    id: "mistral",
    label: "Mistral AI",
    kind: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    suggestedModels: [
      "mistral-small-latest",
      "mistral-medium-latest",
      "mistral-large-latest",
    ],
    keyUrl: "https://console.mistral.ai/api-keys",
    keyHint: "Mistral API key",
  },
  {
    id: "openrouter",
    label: "OpenRouter (many models, one key)",
    kind: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    suggestedModels: [
      "openai/gpt-4o-mini",
      "anthropic/claude-3.5-sonnet",
      "google/gemini-2.0-flash-001",
      "deepseek/deepseek-chat",
      "meta-llama/llama-3.3-70b-instruct",
    ],
    keyUrl: "https://openrouter.ai/keys",
    keyHint: "Starts with sk-or-...",
  },
  {
    id: "xai",
    label: "xAI Grok",
    kind: "openai",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-2-latest",
    suggestedModels: ["grok-2-latest", "grok-2-1212", "grok-beta"],
    keyUrl: "https://console.x.ai",
    keyHint: "Starts with xai-...",
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    kind: "openai",
    baseUrl: "",
    defaultModel: "",
    suggestedModels: [],
    keyUrl: "",
    keyHint: "Key for your endpoint (leave empty for local models)",
    allowEmptyKey: true,
  },
];

export type ProviderId = string;

const BY_ID = new Map(LLM_PROVIDERS.map((provider) => [provider.id, provider]));

export function getProvider(id: string): ProviderDefinition {
  return BY_ID.get(id) || LLM_PROVIDERS[0];
}

export function isKnownProvider(id: string): boolean {
  return BY_ID.has(id);
}

/**
 * Joins a base URL and a path without doubling slashes.
 */
export function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
