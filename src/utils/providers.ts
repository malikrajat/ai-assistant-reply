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
 *
 * `group` only controls how providers are presented in the options dropdown.
 * Adding a provider here automatically extends the settings type, storage
 * defaults, validation, the options page and the popup label.
 */

export const PROVIDER_GROUPS = [
  "Cloud providers",
  "Model gateways",
  "Local & self-hosted",
  "Custom",
] as const;

export type ProviderGroup = (typeof PROVIDER_GROUPS)[number];

export interface ProviderDefinition {
  id: string;
  label: string;
  group: ProviderGroup;
  kind: "gemini" | "anthropic" | "openai";
  baseUrl: string;
  defaultModel: string;
  suggestedModels: readonly string[];
  keyUrl: string;
  keyHint: string;
  /** Local servers normally need no key at all. */
  allowEmptyKey?: boolean;
  /** Show an editable Base URL field (local servers and custom endpoints). */
  allowBaseUrlEdit?: boolean;
  /** Full URL override for model discovery when it is not `{baseUrl}/models`. */
  modelListUrl?: string;
  /** How to parse the provider's model list. Defaults to the request `kind`. */
  modelListKind?: "gemini" | "anthropic" | "openai";
  /** Short, user-facing explanation shown under the provider dropdown. */
  help?: string;
}

export const LLM_PROVIDERS = [
  {
    id: "gemini",
    label: "Google Gemini",
    group: "Cloud providers",
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
    group: "Cloud providers",
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
    group: "Cloud providers",
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
    group: "Cloud providers",
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
    id: "mistral",
    label: "Mistral AI",
    group: "Cloud providers",
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
    id: "xai",
    label: "xAI Grok",
    group: "Cloud providers",
    kind: "openai",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-2-latest",
    suggestedModels: ["grok-2-latest", "grok-2-1212", "grok-beta"],
    keyUrl: "https://console.x.ai",
    keyHint: "Starts with xai-...",
  },
  {
    id: "perplexity",
    label: "Perplexity",
    group: "Cloud providers",
    kind: "openai",
    baseUrl: "https://api.perplexity.ai",
    defaultModel: "sonar",
    suggestedModels: ["sonar", "sonar-pro", "sonar-reasoning"],
    keyUrl: "https://www.perplexity.ai/settings/api",
    keyHint: "Starts with pplx-...",
  },
  {
    id: "moonshot",
    label: "Moonshot AI (Kimi)",
    group: "Cloud providers",
    kind: "openai",
    baseUrl: "https://api.moonshot.ai/v1",
    defaultModel: "moonshot-v1-8k",
    suggestedModels: ["moonshot-v1-8k", "moonshot-v1-32k", "kimi-latest"],
    keyUrl: "https://platform.moonshot.ai/console/api-keys",
    keyHint: "Moonshot API key",
  },
  {
    id: "groq",
    label: "Groq (fast open models)",
    group: "Model gateways",
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
    id: "openrouter",
    label: "OpenRouter (many models, one key)",
    group: "Model gateways",
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
    id: "opencode",
    label: "OpenCode Console (formerly Zen)",
    group: "Model gateways",
    kind: "openai",
    baseUrl: "https://opencode.ai/inference/openai/v1",
    // The gateway serves every text model through the OpenAI-compatible API,
    // including models whose native API is Anthropic or Gemini.
    modelListUrl: "https://opencode.ai/inference/v1/models",
    defaultModel: "gpt-5.4-mini",
    suggestedModels: [
      "gpt-5.4-mini",
      "gpt-5.4-nano",
      "claude-haiku-4.5",
      "gemini-3.5-flash-lite",
      "deepseek-v4.1-flash",
    ],
    keyUrl: "https://opencode.ai/console",
    keyHint: "Starts with oc_sk_...",
    help: "One key for OpenCode's curated models. Paid models work in any client; free chat models are only available inside OpenCode.",
  },
  {
    id: "together",
    label: "Together AI",
    group: "Model gateways",
    kind: "openai",
    baseUrl: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    suggestedModels: [
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "meta-llama/Llama-3.1-8B-Instruct-Turbo",
      "mistralai/Mixtral-8x7B-Instruct-v0.1",
    ],
    keyUrl: "https://api.together.ai/settings/api-keys",
    keyHint: "Starts with ...",
  },
  {
    id: "fireworks",
    label: "Fireworks AI",
    group: "Model gateways",
    kind: "openai",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    suggestedModels: [
      "accounts/fireworks/models/llama-v3p3-70b-instruct",
      "accounts/fireworks/models/llama-v3p1-8b-instruct",
      "accounts/fireworks/models/mixtral-8x7b-instruct",
    ],
    keyUrl: "https://fireworks.ai/account/api-keys",
    keyHint: "Starts with fw_...",
  },
  {
    id: "huggingface",
    label: "Hugging Face Inference",
    group: "Model gateways",
    kind: "openai",
    baseUrl: "https://router.huggingface.co/v1",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct",
    suggestedModels: [
      "meta-llama/Llama-3.3-70B-Instruct",
      "Qwen/Qwen2.5-7B-Instruct",
      "mistralai/Mistral-7B-Instruct-v0.3",
    ],
    keyUrl: "https://huggingface.co/settings/tokens",
    keyHint: "Starts with hf_...",
  },
  {
    id: "github",
    label: "GitHub Models",
    group: "Model gateways",
    kind: "openai",
    baseUrl: "https://models.github.ai/inference",
    defaultModel: "openai/gpt-4.1-mini",
    suggestedModels: [
      "openai/gpt-4.1-mini",
      "openai/gpt-4o-mini",
      "meta/Llama-3.3-70B-Instruct",
      "deepseek/DeepSeek-V3-0324",
    ],
    keyUrl: "https://github.com/settings/tokens",
    keyHint: "GitHub personal access token",
  },
  {
    id: "cerebras",
    label: "Cerebras",
    group: "Model gateways",
    kind: "openai",
    baseUrl: "https://api.cerebras.ai/v1",
    defaultModel: "llama-3.3-70b",
    suggestedModels: ["llama-3.3-70b", "qwen-3-32b", "gpt-oss-120b"],
    keyUrl: "https://cloud.cerebras.ai/platform/api-keys",
    keyHint: "Starts with csk-...",
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    group: "Local & self-hosted",
    kind: "openai",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    suggestedModels: [
      "llama3.2",
      "qwen3:8b",
      "gpt-oss:20b",
      "mistral",
      "phi4",
    ],
    keyUrl: "https://ollama.com/library",
    keyHint: "No API key needed for a local server",
    allowEmptyKey: true,
    allowBaseUrlEdit: true,
    help: "Run `ollama serve` and `ollama pull llama3.2`. If a connection test says the origin is not allowed, set OLLAMA_ORIGINS=chrome-extension://* and restart Ollama.",
  },
  {
    id: "lmstudio",
    label: "LM Studio (local)",
    group: "Local & self-hosted",
    kind: "openai",
    baseUrl: "http://localhost:1234/v1",
    defaultModel: "local-model",
    suggestedModels: ["local-model"],
    keyUrl: "",
    keyHint: "No API key needed for LM Studio",
    allowEmptyKey: true,
    allowBaseUrlEdit: true,
    help: "Start a model in LM Studio and enable its local server. Use Fetch models to see loaded models.",
  },
  {
    id: "vllm",
    label: "vLLM / OpenAI-compatible server",
    group: "Local & self-hosted",
    kind: "openai",
    baseUrl: "http://localhost:8000/v1",
    defaultModel: "",
    suggestedModels: [],
    keyUrl: "",
    keyHint: "Leave empty if your server does not require a key",
    allowEmptyKey: true,
    allowBaseUrlEdit: true,
    help: "Point this at any self-hosted OpenAI-compatible server. Use Fetch models and pick the exact served model ID.",
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    group: "Custom",
    kind: "openai",
    baseUrl: "",
    defaultModel: "",
    suggestedModels: [],
    keyUrl: "",
    keyHint: "Key for your endpoint (leave empty for local models)",
    allowEmptyKey: true,
    allowBaseUrlEdit: true,
    help: "Any OpenAI-compatible endpoint, hosted or local. Chrome will ask for access to the host when you save.",
  },
] as const satisfies readonly ProviderDefinition[];

export type ProviderId = (typeof LLM_PROVIDERS)[number]["id"];

const BY_ID = new Map<string, ProviderDefinition>(
  LLM_PROVIDERS.map((provider) => [provider.id, provider])
);

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
