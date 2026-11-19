import {
  UserSettings,
  GeminiRequest,
  GeminiResponse,
  ComposerSurface,
  GenerationMode,
  ProviderSettings,
} from "../types/index.js";
import { cleanupText, looksLikeNews, truncate } from "./text.js";
import { getProvider, joinUrl } from "./providers.js";

/**
 * Gemini API endpoint
 */
const SYSTEM_PROMPT =
  "You write short, natural LinkedIn text on behalf of a user. " +
  "You follow the instructions exactly, stay grounded in the context you are given, " +
  "and return only the finished text with no preamble or explanation.";

export interface PromptMeta {
  surface?: ComposerSurface;
  mode?: GenerationMode;
  authorName?: string;
  recipientName?: string;
  draft?: string;
  charLimit?: number;
}

/** Credentials with the defaults already filled in. */
export interface ResolvedProviderConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

/**
 * Surface-specific instructions. Each composer needs a different shape of
 * answer: a comment is public and short, a DM is conversational, an
 * invitation note has a hard character cap, a post draft needs structure.
 */
function buildSurfaceInstruction(
  surface: ComposerSurface,
  mode: GenerationMode,
  charLimit: number,
  contextText: string
): string {
  switch (surface) {
    case "invite":
      return `Write a LinkedIn connection request note from the user to the person described below.
Hard limit: ${charLimit} characters including spaces (LinkedIn rejects longer notes).
Rules: warm and human, mention something specific from the description, no sales pitch,
no links, no placeholders such as [Name], no greeting line unless it is very short.`;

    case "message":
      return mode === "compose"
        ? `Write the next LinkedIn message the user will send in this conversation.
Keep it under ${charLimit} characters, conversational and direct, like a real chat message.
No subject line, no "Dear", no signature.`
        : `Write the user's next LinkedIn message in this conversation.
Sound like a real person texting a professional contact: natural, warm, no corporate filler.
Keep it under ${charLimit} characters. No greeting unless the thread needs one, no signature.`;

    case "greeting":
      return `Write a short LinkedIn congratulations message the user will send from the "Catch up" card.
The occasion (birthday, work anniversary, new job, promotion, education) and the person's name are in the context below.
Rules: 1-2 warm, specific sentences, mention the occasion naturally, no hashtags, no signature,
no generic filler like "Wishing you all the best in your future endeavours", and never use
customer-service wording such as "we have received", "we will let you know" or
"thank you for reaching out" - this is a personal congratulations note.
Keep it under ${charLimit} characters.`;

    case "post":
      return `Turn the notes below into a LinkedIn post written in the user's voice.
Structure: a scroll-stopping first line, then 2-4 short paragraphs or tight lines.
Keep it under ${charLimit} characters, plain text only, no hashtags unless the notes ask for them.
Avoid buzzwords, avoid emojis unless the notes use them.`;

    case "generic":
      return `Write text the user can use in the text box described below.
Keep it under ${charLimit} characters, plain text, ready to send or paste.`;

    case "comment":
    default: {
      // Announcement posts ("starting a new position at ...", promotions,
      // anniversaries) need a specific, grounded reaction - not generic
      // commentary - or the reply reads as unrelated to the post.
      if (looksLikeNews(contextText)) {
        return `Write a LinkedIn comment from one professional to another, responding to the news in the post below.
Rules:
- Congratulate the author and name the specific detail from the post (the role, the company, or the milestone).
- Write in first person, the way a colleague would react.
- 1-2 sentences, warm and genuine. No hashtags, no greeting line, no signature.
- Never write customer-service or corporate-acknowledgement wording. The comment must never
  sound like "we have received your information", "we will let you know", "thank you for
  reaching out", "your request has been processed" or anything similar. The author is
  announcing personal news, not filing a ticket.
- Never invent employers, titles, dates or numbers that are not in the post.
Example of the right shape (do not copy these words): "Congrats on the new role at Apple -
that is a big step, and the iOS work there is in good hands."
Keep it under ${charLimit} characters.`;
      }

      return `Write a LinkedIn comment replying to the post below.
Keep it under ${charLimit} characters.
Rules: sound like a thoughtful person, add a specific reaction or insight from the post,
never restate the post, no hashtags, no "Great post!", no greeting, no signature.`;
    }
  }
}

/**
 * Builds a prompt for the Gemini API based on post text and user settings
 */
export function buildPrompt(
  contextText: string,
  settings: UserSettings,
  meta: PromptMeta = {}
): string {
  const toneInstructions: Record<UserSettings["tone"], string> = {
    polite: "Write a polite and respectful reply",
    professional:
      "Write in a professional but human voice (no corporate boilerplate)",
    friendly: "Write a friendly and warm reply",
    concise: "Write a brief and to-the-point reply",
  };

  const surface = meta.surface ?? "comment";
  const mode = meta.mode ?? "reply";
  const charLimit = meta.charLimit ?? settings.maxLength;

  const sections: string[] = [];

  sections.push("Tone: " + toneInstructions[settings.tone] + ".");
  sections.push(buildSurfaceInstruction(surface, mode, charLimit, contextText));
  sections.push(
    `Output rules: return only the finished text. No quotation marks around it, no
labels, no explanation, no preamble, no markdown formatting. Use only the facts given
in the context below - never invent names, companies, dates or numbers. Never mention
that you are an AI or that text was generated.
Never ask the user questions, never request more information, never say you are waiting,
and never mention instructions, character limits, placeholders or the drafting process.
Even if the context is thin, write the best short reply you can from what is there -
the text you return is posted publicly exactly as written.`
  );

  if (meta.authorName) {
    sections.push(`Written by / addressed to: ${meta.authorName}`);
  }
  if (meta.recipientName) {
    sections.push(`Recipient: ${meta.recipientName}`);
  }

  // The delimited block is what keeps the model grounded: it is told exactly
  // which text to answer, and that everything outside the quotes is instruction.
  sections.push(
    `CONTEXT - this is the exact text you are responding to:\n"""\n${contextText}\n"""`
  );

  if (meta.draft) {
    sections.push(
      `The user already started typing this draft - keep their intent and improve on it:\n${meta.draft}`
    );
  }

  sections.push(
    "Your reply must reference something concrete from CONTEXT (a role, company, project, number or idea). Never answer with a generic acknowledgement."
  );
  sections.push("Your text:");

  return sections.join("\n\n");
}

/**
 * Maps tone settings to API temperature values
 * Higher temperature = more creative/varied responses
 */
export function getToneTemperature(tone: UserSettings["tone"]): number {
  const temperatureMap: Record<UserSettings["tone"], number> = {
    polite: 0.7,
    professional: 0.5,
    friendly: 0.8,
    concise: 0.3,
  };

  return temperatureMap[tone];
}

/**
 * Extracts reply text from Gemini API response
 */
export function extractReplyText(response: GeminiResponse): string {
  // Log the full response for debugging
  console.log("[API] Full Gemini response:", JSON.stringify(response, null, 2));

  // Check for API error
  if (response.error) {
    throw new Error(
      `Gemini API error: ${response.error.message} (${response.error.status})`
    );
  }

  // Check for candidates
  if (!response.candidates || response.candidates.length === 0) {
    console.error("[API] No candidates in response:", response);
    throw new Error("No reply generated by Gemini API");
  }

  // Extract text from first candidate
  const candidate = response.candidates[0];
  console.log("[API] First candidate:", JSON.stringify(candidate, null, 2));

  // Check for MAX_TOKENS finish reason
  if (candidate.finishReason === "MAX_TOKENS") {
    throw new Error("Response was cut off due to token limit. Please reduce the max length setting or try a shorter post.");
  }

  if (!candidate.content) {
    console.error("[API] No content in candidate:", candidate);
    throw new Error("Invalid response format from Gemini API: missing content");
  }

  if (!candidate.content.parts || candidate.content.parts.length === 0) {
    console.error("[API] No parts in content:", candidate.content);
    throw new Error("Invalid response format from Gemini API: missing parts");
  }

  const replyText = candidate.content.parts[0].text;

  if (!replyText || replyText.trim().length === 0) {
    console.error("[API] Empty text in part:", candidate.content.parts[0]);
    throw new Error("Empty reply generated by Gemini API");
  }

  return replyText.trim();
}

/**
 * Fetch with retry logic and exponential backoff
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    let response: Response;

    // Network failures are worth retrying.
    try {
      response = await fetch(url, options);
    } catch (error) {
      lastError = error as Error;

      if (i === maxRetries - 1) throw lastError;

      const waitTime = Math.pow(2, i) * 1000;
      console.log(`[API] Network error, retry ${i + 1}/${maxRetries} after ${waitTime}ms...`);
      await sleep(waitTime);
      continue;
    }

    if (response.ok) return response;

    // Client errors (bad key, unknown model, no credits) fail fast.
    if (response.status >= 400 && response.status < 500) {
      const errorText = await response.text();
      throw new Error(
        `API error ${response.status}: ${errorText || response.statusText}`
      );
    }

    // Server errors (5xx) are retried with exponential backoff.
    lastError = new Error(
      `Server error ${response.status}: ${response.statusText}`
    );

    if (i === maxRetries - 1) throw lastError;

    const waitTime = Math.pow(2, i) * 1000;
    console.log(`[API] Server error, retry ${i + 1}/${maxRetries} after ${waitTime}ms...`);
    await sleep(waitTime);
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error("Unknown error during fetch");
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls the Gemini API to generate a reply
 */
/**
 * Resolves the credentials for the provider the user selected, migrating the
 * legacy single-key setting if needed.
 */
export function resolveProviderConfig(settings: UserSettings): {
  provider: ReturnType<typeof getProvider>;
  config: ResolvedProviderConfig;
} {
  const provider = getProvider(settings.provider || "gemini");
  const configured = settings.providers?.[provider.id as never] as
    | ProviderSettings
    | undefined;

  const legacyKey =
    provider.id === "gemini" && !configured?.apiKey ? settings.apiKey : "";

  const config: ResolvedProviderConfig = {
    apiKey: (configured?.apiKey || legacyKey || "").trim(),
    model: (configured?.model || provider.defaultModel).trim(),
    baseUrl: (configured?.baseUrl || provider.baseUrl || "").trim(),
  };

  return { provider, config };
}

/**
 * Calls whichever provider the user configured.
 */
export async function callLLM(
  contextText: string,
  settings: UserSettings,
  meta: PromptMeta = {}
): Promise<string> {
  const { provider, config } = resolveProviderConfig(settings);

  if (!config.apiKey && !provider.allowEmptyKey) {
    throw new Error(
      `${provider.label} API key not configured. Open the extension settings and add it.`
    );
  }

  if (!config.model) {
    throw new Error(`No model selected for ${provider.label}.`);
  }

  if (!config.baseUrl) {
    throw new Error(`No base URL configured for ${provider.label}.`);
  }

  const charLimit = meta.charLimit ?? settings.maxLength;
  const prompt = buildPrompt(contextText, settings, { ...meta, charLimit });
  const temperature = getToneTemperature(settings.tone);

  // Logged (including in production builds) so a bad reply can be traced back to
  // the exact context the model was given.
  console.log(
    `[API] Prompt sent to ${provider.label} (${config.model}):\n${prompt}`
  );

  // Reasoning models (Gemini 2.5, deepseek-reasoner, ...) spend tokens thinking
  // before writing, so the output budget needs headroom.
  const outputTokens = Math.ceil((charLimit || 500) / 2);
  const maxTokens = Math.max(outputTokens + 500, 1024);

  try {
    let reply: string;

    if (provider.kind === "gemini") {
      reply = await callGemini(prompt, config, temperature, maxTokens);
    } else if (provider.kind === "anthropic") {
      reply = await callAnthropic(prompt, config, temperature, maxTokens);
    } else {
      reply = await callOpenAICompatible(prompt, config, temperature, maxTokens);
    }

    console.log("[API] Reply received:", reply);
    return reply;
  } catch (error) {
    console.error(`[API] Error calling ${provider.label}:`, error);
    throw toFriendlyError(error, provider.label, provider.allowEmptyKey);
  }
}

/**
 * Google Gemini `generateContent`.
 */
async function callGemini(
  prompt: string,
  config: ResolvedProviderConfig,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const endpoint = `${joinUrl(
    config.baseUrl,
    `models/${config.model}:generateContent`
  )}?key=${encodeURIComponent(config.apiKey)}`;

  const requestBody: GeminiRequest = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  };

  const response = await fetchWithRetry(
    endpoint,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    },
    3
  );

  const data: GeminiResponse = await response.json();
  return extractReplyText(data);
}

/**
 * Any OpenAI-compatible `/chat/completions` endpoint: OpenAI, DeepSeek, Groq,
 * Mistral, OpenRouter, xAI and self-hosted gateways.
 */
async function callOpenAICompatible(
  prompt: string,
  config: ResolvedProviderConfig,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const endpoint = joinUrl(config.baseUrl, "chat/completions");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const response = await fetchWithRetry(
    endpoint,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
    },
    3
  );

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (data.error?.message) {
    throw new Error(data.error.message);
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("The provider returned an empty response.");
  }

  return text;
}

/**
 * Anthropic Messages API.
 */
async function callAnthropic(
  prompt: string,
  config: ResolvedProviderConfig,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const endpoint = joinUrl(config.baseUrl, "messages");

  const response = await fetchWithRetry(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        // Required when calling Anthropic from a browser context.
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        temperature,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
    },
    3
  );

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    error?: { message?: string };
  };

  if (data.error?.message) {
    throw new Error(data.error.message);
  }

  const text = (data.content || [])
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join("")
    .trim();

  if (!text) {
    throw new Error("The provider returned an empty response.");
  }

  return text;
}

/**
 * Turns provider errors into something a user can act on.
 */
function toFriendlyError(
  error: unknown,
  providerLabel: string,
  allowEmptyKey?: boolean
): Error {
  const message = error instanceof Error ? error.message : String(error);

  if (/401|unauthoriz|invalid.*api.?key|authentication/i.test(message)) {
    return new Error(
      `${providerLabel} rejected the API key. Check it in the extension settings.`
    );
  }
  if (/402|insufficient|credit|balance/i.test(message)) {
    return new Error(`${providerLabel} account has no credits left.`);
  }
  if (/403|permission|not allowed/i.test(message)) {
    return new Error(
      `${providerLabel} denied the request. ${
        allowEmptyKey
          ? "The endpoint may need to be allowed in the extension permissions."
          : "Check that your key has access to this model."
      }`
    );
  }
  if (/404|model/i.test(message) && /not found|does not exist|unknown/i.test(message)) {
    return new Error(
      `${providerLabel} does not recognise that model name. Pick another model in settings.`
    );
  }
  if (/429|quota|rate limit|too many requests/i.test(message)) {
    return new Error(`${providerLabel} rate limit or quota reached. Try again later.`);
  }
  if (/network|failed to fetch|load failed|fetch/i.test(message)) {
    return new Error(
      `Could not reach ${providerLabel}. Check your connection${
        allowEmptyKey ? " and that the host is allowed for this extension" : ""
      }.`
    );
  }

  return new Error(`${providerLabel} error: ${message}`);
}

/**
 * Sanitizes post text before sending to API
 * Removes excessive whitespace and limits length
 */
export function sanitizePostText(text: string, maxLength = 5000): string {
  // Strips markdown mention syntax, zero-width characters, "see more" tails and
  // scraped LinkedIn UI strings before the text reaches the model.
  return truncate(text, maxLength);
}
