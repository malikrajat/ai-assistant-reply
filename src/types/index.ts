import { LLM_PROVIDERS } from "../utils/providers.js";

// AI Provider Selection
export type LLMProvider =
  | "gemini"
  | "openai"
  | "anthropic"
  | "deepseek"
  | "groq"
  | "mistral"
  | "openrouter"
  | "xai"
  | "custom";

// Per-provider credentials and model
export interface ProviderSettings {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

// User Settings Interface
export interface UserSettings {
  provider: LLMProvider;
  providers: Record<LLMProvider, ProviderSettings>;
  apiKey: string; // legacy Gemini key - kept so old installs keep working
  tone: 'polite' | 'professional' | 'friendly' | 'concise';
  maxLength: number;
  defaultAction: 'insert' | 'copy';
  rateLimit: number;
  stealthMode: boolean; // Enable typing simulation
  floatingButton: boolean; // Show the quick "✨" button next to any text box
}

function defaultProviderSettings(): Record<LLMProvider, ProviderSettings> {
  const entries = LLM_PROVIDERS.map((provider) => [
    provider.id,
    { apiKey: "", model: provider.defaultModel, baseUrl: provider.baseUrl },
  ]);

  return Object.fromEntries(entries) as Record<LLMProvider, ProviderSettings>;
}

// Default settings
export const DEFAULT_SETTINGS: UserSettings = {
  provider: 'gemini',
  providers: defaultProviderSettings(),
  apiKey: '',
  tone: 'professional',
  maxLength: 500,
  defaultAction: 'insert',
  rateLimit: 50,
  stealthMode: true,
  floatingButton: true
};

/**
 * Every place the assistant can help write text.
 * "comment"  -> reply to a post
 * "message"  -> LinkedIn messaging / InMail conversation
 * "invite"   -> connection request note
 * "greeting" -> congratulations / birthday / anniversary cards from "Catch up"
 * "post"     -> post composer (drafts a post from a topic)
 * "generic"  -> any other multi-line text box on LinkedIn
 */
export type ComposerSurface =
  | 'comment'
  | 'message'
  | 'invite'
  | 'greeting'
  | 'post'
  | 'generic';

/** Reply to someone else's text, or compose something new. */
export type GenerationMode = 'reply' | 'compose';

// A detected text box the assistant can attach to
export interface ComposerInfo {
  element: HTMLElement; // the editable element itself
  container: HTMLElement; // surrounding block used for button placement
  surface: ComposerSurface;
  label: string; // short label for the inline button
}

// The context gathered for a composer before calling the LLM
export interface ComposerContext {
  contextText: string;
  surface: ComposerSurface;
  mode: GenerationMode;
  authorName?: string;
  recipientName?: string;
  draft?: string;
  error?: string;
}

// Usage Data Interface
export interface UsageData {
  count: number;
  resetDate: number; // timestamp in milliseconds
  limit: number;
}

// Message Types - Content Script to Service Worker
export interface GenerateReplyRequest {
  type: 'GENERATE_REPLY';
  payload: {
    postText: string;
    authorName?: string;
    postDate?: string;
    surface?: ComposerSurface;
    mode?: GenerationMode;
    recipientName?: string;
    draft?: string;
  };
}

export interface GetSettingsRequest {
  type: 'GET_SETTINGS';
}

export interface GetUsageRequest {
  type: 'GET_USAGE';
}

export type MessageToBackground = 
  | GenerateReplyRequest 
  | GetSettingsRequest 
  | GetUsageRequest;

// Message Types - Service Worker to Content Script
export interface GenerateReplyResponse {
  success: boolean;
  reply?: string;
  error?: string;
  usageCount?: number;
  rateLimitReached?: boolean;
}

export interface SettingsResponse {
  type: 'SETTINGS_RESPONSE';
  settings: UserSettings;
}

export interface UsageResponse {
  type: 'USAGE_RESPONSE';
  usage: UsageData;
}

export type MessageToContent = 
  | GenerateReplyResponse
  | SettingsResponse 
  | UsageResponse
  | TriggerReplyMessage;

// Sent by the service worker when the user presses the keyboard shortcut
export interface TriggerReplyMessage {
  type: 'TRIGGER_REPLY';
}

// Gemini API Types
export interface GeminiRequestPart {
  text: string;
}

export interface GeminiRequestContent {
  parts: GeminiRequestPart[];
}

export interface GeminiGenerationConfig {
  maxOutputTokens?: number;
  temperature?: number;
}

export interface GeminiRequest {
  contents: GeminiRequestContent[];
  generationConfig?: GeminiGenerationConfig;
}

export interface GeminiCandidate {
  content: {
    parts: Array<{
      text: string;
    }>;
  };
  finishReason?: string;
}

export interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

// DOM Selectors
export interface LinkedInSelectors {
  postContainer: string;
  commentBox: string;
  commentTextarea: string;
  postContent: string;
  authorName: string;
  postDate: string;
}

// Post Data
export interface PostData {
  postText: string;
  authorName?: string;
  postDate?: string;
}
