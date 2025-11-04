// User Settings Interface
export interface UserSettings {
  apiKey: string;
  tone: 'polite' | 'professional' | 'friendly' | 'concise';
  maxLength: number;
  defaultAction: 'insert' | 'copy';
  rateLimit: number;
  stealthMode: boolean; // Enable typing simulation
}

// Default settings
export const DEFAULT_SETTINGS: UserSettings = {
  apiKey: '',
  tone: 'professional',
  maxLength: 500,
  defaultAction: 'insert',
  rateLimit: 50,
  stealthMode: true
};

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
  | UsageResponse;

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
