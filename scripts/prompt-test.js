/**
 * Prompt quality checks.
 *
 * Transpiles src/utils/api.ts with the TypeScript compiler (already a dev
 * dependency) and asserts the prompt that actually reaches Gemini: context
 * clean-up, grounding rules, and the occasion-aware comment instruction.
 *
 * Run with: npm run test:prompt
 */

import { readFileSync, writeFileSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join, resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import ts from "typescript";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apiSource = readFileSync(resolve(rootDir, "src/utils/api.ts"), "utf8");
const textSource = readFileSync(resolve(rootDir, "src/utils/text.ts"), "utf8");
const providersSource = readFileSync(
  resolve(rootDir, "src/utils/providers.ts"),
  "utf8"
);

const compilerOptions = {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2020,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
};

const workDir = mkdtempSync(join(tmpdir(), "prompt-test-"));
writeFileSync(
  join(workDir, "text.mjs"),
  ts.transpileModule(textSource, { compilerOptions }).outputText,
  "utf8"
);
writeFileSync(
  join(workDir, "providers.mjs"),
  ts.transpileModule(providersSource, { compilerOptions }).outputText,
  "utf8"
);

const modulePath = join(workDir, "api.mjs");
writeFileSync(
  modulePath,
  ts
    .transpileModule(apiSource, { compilerOptions })
    .outputText.replace(/\.\/text\.js/g, "./text.mjs")
    .replace(/\.\/providers\.js/g, "./providers.mjs"),
  "utf8"
);

const api = await import(pathToFileURL(modulePath).href);
const providersModule = await import(
  pathToFileURL(join(workDir, "providers.mjs")).href
);

const DEFAULT_PROVIDERS = Object.fromEntries(
  providersModule.LLM_PROVIDERS.map((provider) => [
    provider.id,
    { apiKey: "", model: provider.defaultModel, baseUrl: provider.baseUrl },
  ])
);

const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    console.log(`  FAIL  ${label} ${detail}`);
    failures.push(label);
  }
}

const settings = {
  apiKey: "test",
  tone: "professional",
  maxLength: 500,
  defaultAction: "insert",
  rateLimit: 50,
  stealthMode: true,
  floatingButton: true,
};

// The exact post the user reported, as LinkedIn's DOM hands it over.
const rawPost =
  "I\u2019m happy to share that I\u2019m starting a new position as Lead Engineer iOS at " +
  "[**JPMorganChase**](https://www.linkedin.com/company/jpmorganchase/)! \u200b\u200b " +
  "…see more";

console.log("Prompt quality checks\n");

const sanitized = api.sanitizePostText(rawPost);

check(
  "mention keeps the company name",
  sanitized.includes("JPMorganChase")
);
check(
  "raw URL is stripped from the context",
  !sanitized.includes("https://")
);
check(
  "zero-width characters are removed",
  !/[\u200b\u200c\u200d\ufeff]/.test(sanitized)
);
check(
  '"see more" tail is removed',
  !/see more/i.test(sanitized)
);

// The reported bug: our own button label leaked into the context and the model
// replied to "Generating..." instead of the post.
const leaked = api.sanitizePostText(
  "AI Reply Generating... We are hiring two backend engineers in Boston. Regenerate Usage: 3/50"
);

check(
  "own button labels are stripped from context",
  !/generating/i.test(leaked) && !/AI Reply/i.test(leaked) && !/Regenerate/i.test(leaked),
  `(got "${leaked}")`
);
check(
  "real post text survives the clean-up",
  /hiring two backend engineers in Boston/i.test(leaked),
  `(got "${leaked}")`
);

const prompt = api.buildPrompt(sanitized, settings, {
  surface: "comment",
  mode: "reply",
  charLimit: 500,
});

check(
  "announcement post gets a congratulation instruction",
  /congratulat/i.test(prompt),
  "(prompt had no congratulation wording)"
);
check(
  "prompt asks for a specific detail from the post",
  /name the specific detail from the post/i.test(prompt)
);
check(
  "prompt forbids inventing facts",
  /never invent/i.test(prompt)
);
check(
  "prompt blocks customer-service phrasing",
  /we have received/i.test(prompt) && /we will let you know/i.test(prompt)
);
check(
  "prompt shows an example of the right shape",
  /do not copy these words/i.test(prompt)
);
check(
  "prompt asks for first-person colleague voice",
  /first person/i.test(prompt)
);
check(
  "prompt forbids asking questions or stalling",
  /never ask the user questions/i.test(prompt) && /never say you are waiting/i.test(prompt)
);
check("post text is included in the prompt", prompt.includes("Lead Engineer iOS"));
check(
  "prompt has no leftover markdown link",
  !prompt.includes("](http")
);

// A post that is not news should keep the analysis-style instruction.
const discussionPost =
  "Most teams over-index on tooling and under-index on hiring. What has worked for you?";
const discussionPrompt = api.buildPrompt(discussionPost, settings, {
  surface: "comment",
  mode: "reply",
  charLimit: 500,
});

check(
  "non-news post keeps the discussion instruction",
  /thoughtful person/i.test(discussionPrompt) &&
    !/congratulat/i.test(discussionPrompt)
);

// Greeting surface should mention the occasion.
const greetingPrompt = api.buildPrompt(
  "Congratulate Priya on her work anniversary - 3 years at Northwind Labs",
  settings,
  { surface: "greeting", mode: "compose", charLimit: 500 }
);

check(
  "greeting prompt mentions the occasion",
  /anniversary/i.test(greetingPrompt) && /1-2 warm/i.test(greetingPrompt)
);

// ---------------------------------------------------------- provider wiring --

const requests = [];

function stubFetch(reply, options = {}) {
  globalThis.fetch = async (url, init) => {
    // GET requests (model discovery) have no body to parse.
    requests.push({
      url: String(url),
      init,
      body: init.body ? JSON.parse(init.body) : null,
    });

    if (options.status && options.status >= 400) {
      return {
        ok: false,
        status: options.status,
        statusText: options.statusText || "Error",
        text: async () => options.errorBody || "invalid api key",
        json: async () => ({ error: { message: options.errorBody } }),
      };
    }

    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => reply,
      text: async () => "",
    };
  };
}

function settingsFor(providerId, apiKey, model) {
  return {
    ...settings,
    provider: providerId,
    providers: {
      ...DEFAULT_PROVIDERS,
      [providerId]: { apiKey, model, baseUrl: undefined },
    },
  };
}

/**
 * Expected provider failures are real test cases, but their console output
 * looks like a broken build. Keep the assertion and hide only the logs emitted
 * by callLLM during that one call.
 */
async function captureExpectedError(providerId, apiKey, model) {
  const originalLog = console.log;
  const originalError = console.error;
  console.log = () => {};
  console.error = () => {};

  try {
    await api.callLLM("post", settingsFor(providerId, apiKey, model), {
      surface: "comment",
      mode: "reply",
      charLimit: 300,
    });
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

// DeepSeek is the provider the user asked for: OpenAI-compatible shape.
stubFetch({ choices: [{ message: { content: "Congrats on the new role at Apple!" } }] });
const deepseekReply = await api.callLLM(
  "I am happy to share that I am starting a new position as a Senior Software Engineer at Apple!",
  settingsFor("deepseek", "sk-deepseek-test", "deepseek-chat"),
  { surface: "comment", mode: "reply", charLimit: 300 }
);
const deepseekRequest = requests.at(-1);

check("deepseek returns the provider text", deepseekReply.includes("Apple"));
check(
  "deepseek uses the OpenAI-compatible endpoint",
  deepseekRequest.url === "https://api.deepseek.com/v1/chat/completions",
  `(${deepseekRequest.url})`
);
check(
  "deepseek request carries the bearer token",
  deepseekRequest.init.headers.Authorization === "Bearer sk-deepseek-test"
);
check("deepseek request uses the chosen model", deepseekRequest.body.model === "deepseek-chat");
check(
  "deepseek request includes a system message and the post text",
  deepseekRequest.body.messages[0].role === "system" &&
    deepseekRequest.body.messages[1].content.includes("Senior Software Engineer at Apple")
);

// Anthropic uses the Messages API.
stubFetch({ content: [{ type: "text", text: "Congratulations on the Apple role!" }] });
const claudeReply = await api.callLLM("Some post text about a promotion", settingsFor("anthropic", "sk-ant-test", "claude-3-5-sonnet-latest"), {
  surface: "comment",
  mode: "reply",
  charLimit: 300,
});
const claudeRequest = requests.at(-1);

check("anthropic returns the provider text", claudeReply.includes("Apple"));
check(
  "anthropic uses the messages endpoint",
  claudeRequest.url === "https://api.anthropic.com/v1/messages",
  `(${claudeRequest.url})`
);
check(
  "anthropic request sends the key and version headers",
  claudeRequest.init.headers["x-api-key"] === "sk-ant-test" &&
    claudeRequest.init.headers["anthropic-version"] === "2023-06-01"
);
check("anthropic request passes the model", claudeRequest.body.model === "claude-3-5-sonnet-latest");

// Gemini keeps using generateContent.
stubFetch({ candidates: [{ content: { parts: [{ text: "Congrats on the new role!" }] } }] });
await api.callLLM("Some post text about a promotion", settingsFor("gemini", "AIza-test", "gemini-2.5-flash"), {
  surface: "comment",
  mode: "reply",
  charLimit: 300,
});
const geminiRequest = requests.at(-1);

check(
  "gemini uses generateContent with the model in the path",
  geminiRequest.url.includes("/models/gemini-2.5-flash:generateContent"),
  `(${geminiRequest.url})`
);
check(
  "gemini request keeps the post text in the prompt",
  geminiRequest.body.contents[0].parts[0].text.includes("Some post text about a promotion")
);

// ---------------------------------------------- new provider presets + local --

const registry = providersModule.LLM_PROVIDERS;
const registeredIds = registry.map((provider) => provider.id);

check(
  "provider ids are unique",
  new Set(registeredIds).size === registry.length
);
check(
  "OpenCode and Ollama are first-class providers",
  registeredIds.includes("opencode") &&
    registeredIds.includes("ollama") &&
    registeredIds.includes("lmstudio") &&
    registeredIds.includes("vllm")
);
check(
  "local servers can run without a key",
  providersModule
    .getProvider("ollama")
    .allowEmptyKey === true &&
    providersModule.getProvider("ollama").baseUrl ===
      "http://localhost:11434/v1"
);
check(
  "OpenCode uses the Console chat endpoint and model list",
  providersModule.getProvider("opencode").baseUrl ===
    "https://opencode.ai/inference/openai/v1" &&
    providersModule.getProvider("opencode").modelListUrl ===
      "https://opencode.ai/inference/v1/models"
);

stubFetch({ choices: [{ message: { content: "Congrats on the Apple role!" } }] });
await api.callLLM(
  "Some post text about a promotion",
  settingsFor("opencode", "oc_sk_test", "gpt-5.4-mini"),
  { surface: "comment", mode: "reply", charLimit: 300 }
);
const opencodeRequest = requests.at(-1);

check(
  "OpenCode request reaches the gateway's chat completions endpoint",
  opencodeRequest.url ===
    "https://opencode.ai/inference/openai/v1/chat/completions",
  `(${opencodeRequest.url})`
);
check(
  "OpenCode request carries the bearer token",
  opencodeRequest.init.headers.Authorization === "Bearer oc_sk_test"
);

stubFetch({ choices: [{ message: { content: "Congrats on the Apple role!" } }] });
await api.callLLM(
  "Some post text about a promotion",
  settingsFor("ollama", "", "llama3.2"),
  { surface: "comment", mode: "reply", charLimit: 300 }
);
const ollamaRequest = requests.at(-1);

check(
  "Ollama request reaches the local server",
  ollamaRequest.url === "http://localhost:11434/v1/chat/completions",
  `(${ollamaRequest.url})`
);
check(
  "Ollama request omits Authorization when there is no key",
  !("Authorization" in ollamaRequest.init.headers)
);

// Model discovery: OpenAI-compatible, Ollama and Gemini response shapes.
stubFetch({
  data: [
    { id: "llama3.2" },
    { id: "nomic-embed-text" },
    { id: "qwen3:8b" },
  ],
});
const ollamaModels = await api.fetchProviderModels("ollama", {
  apiKey: "",
  model: "",
  baseUrl: "http://localhost:11434/v1",
});
check(
  "Ollama model discovery lists chat models only",
  ollamaModels.includes("llama3.2") &&
    ollamaModels.includes("qwen3:8b") &&
    !ollamaModels.includes("nomic-embed-text"),
  `(${ollamaModels.join(", ")})`
);
check(
  "Ollama model discovery calls /v1/models",
  requests.at(-1).url === "http://localhost:11434/v1/models"
);

stubFetch({
  models: [
    { name: "models/gemini-2.5-flash" },
    { name: "models/gemini-2.5-flash-image" },
  ],
});
const geminiModels = await api.fetchProviderModels("gemini", {
  apiKey: "AIza-test",
  model: "",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
});
check(
  "Gemini model discovery strips the models/ prefix and image models",
  geminiModels.includes("gemini-2.5-flash") &&
    !geminiModels.some((model) => model.includes("models/") || /image/i.test(model)),
  `(${geminiModels.join(", ")})`
);
check(
  "Gemini model discovery sends the key",
  requests.at(-1).url.includes("key=AIza-test")
);

stubFetch({ data: [{ id: "gpt-5.4-mini" }, { id: "claude-haiku-4.5" }] });
await api.fetchProviderModels("opencode", {
  apiKey: "oc_sk_test",
  model: "",
  baseUrl: "https://opencode.ai/inference/openai/v1",
});
check(
  "OpenCode model discovery uses the override URL",
  requests.at(-1).url === "https://opencode.ai/inference/v1/models",
  `(${requests.at(-1).url})`
);

// Errors should be actionable, not raw provider noise.
stubFetch(null, { status: 401, errorBody: "invalid api key provided" });
const errorMessage = await captureExpectedError("deepseek", "bad", "deepseek-chat");

check(
  "bad key produces an actionable message",
  /DeepSeek rejected the API key/i.test(errorMessage),
  `(${errorMessage})`
);

// A missing key is called out with the provider name.
const missingKeyMessage = await captureExpectedError(
  "groq",
  "",
  "llama-3.3-70b-versatile"
);

check(
  "missing key names the provider",
  /Groq .*API key not configured/i.test(missingKeyMessage),
  `(${missingKeyMessage})`
);

// Ollama returns a 403 when a browser extension origin is not allowlisted.
stubFetch(null, {
  status: 403,
  statusText: "Forbidden",
  errorBody: "Forbidden: origin not allowed",
});
const originMessage = await captureExpectedError("ollama", "", "llama3.2");

check(
  "Ollama origin error explains OLLAMA_ORIGINS",
  /OLLAMA_ORIGINS=chrome-extension:\/\/\*/.test(originMessage),
  `(${originMessage})`
);

if (failures.length) {
  console.log(`\n${failures.length} check(s) failed: ${failures.join(", ")}`);
  process.exit(1);
}

console.log("\nAll prompt checks passed.");
