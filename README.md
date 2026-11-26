# LinkedIn AI Reply Assistant

<p align="center">
  <img src="https://img.shields.io/badge/version-1.1.0-blue?logo=googlechrome&logoColor=white" alt="Extension version 1.1.0">
  <img src="https://img.shields.io/badge/Manifest-V3-success" alt="Manifest V3">
  <img src="https://img.shields.io/badge/Chrome-91%2B-blue?logo=googlechrome&logoColor=white" alt="Chrome 91 or newer">
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript&logoColor=white" alt="Strict TypeScript">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license">
  <img src="https://img.shields.io/github/issues/malikrajat/ai-assistant-reply" alt="Open issues">
  <img src="https://img.shields.io/github/stars/malikrajat/ai-assistant-reply" alt="GitHub stars">
  <img src="https://img.shields.io/github/issues-pr/malikrajat/ai-assistant-reply" alt="Open pull requests">
  <img src="https://img.shields.io/github/contributors/malikrajat/ai-assistant-reply?color=blue" alt="Contributors">
  <img src="https://img.shields.io/github/commit-activity/m/malikrajat/ai-assistant-reply" alt="Commit activity">
  <img src="https://img.shields.io/github/last-commit/malikrajat/ai-assistant-reply" alt="Last commit">
  <img src="https://img.shields.io/badge/status-active-success" alt="Actively maintained">
  <img src="https://img.shields.io/badge/runtime%20dependencies-0-success" alt="Zero runtime dependencies">
  <img src="https://img.shields.io/badge/telemetry-none-success" alt="No telemetry">
  <img src="https://img.shields.io/badge/storage-local%20only-success" alt="Local-only storage">
  <img src="https://img.shields.io/badge/API%20key-Bring%20Your%20Own-blue" alt="Bring your own API key">
  <img src="https://img.shields.io/badge/providers-9%20options-blue" alt="Nine provider options">
  <img src="https://img.shields.io/badge/AI-Gemini%20%7C%20OpenAI%20%7C%20Claude%20%7C%20DeepSeek-blue" alt="Supported AI providers">
  <img src="https://img.shields.io/badge/surfaces-comments%20%7C%20DMs%20%7C%20notes%20%7C%20posts-blue" alt="Supported LinkedIn surfaces">
  <img src="https://img.shields.io/badge/shortcut-Alt%2BShift%2BG-blue" alt="Keyboard shortcut Alt+Shift+G">
  <img src="https://img.shields.io/badge/typing-human--like-success" alt="Human-like text insertion">
  <img src="https://img.shields.io/badge/build-Vite%205-646CFF?logo=vite&logoColor=white" alt="Built with Vite 5">
  <img src="https://img.shields.io/badge/Node-18%2B%20%2F%2020%20LTS-339933?logo=nodedotjs&logoColor=white" alt="Node 18 or newer, 20 LTS recommended">
  <img src="https://img.shields.io/badge/tests-smoke%20%2B%20prompt-success" alt="Smoke and prompt tests">
  <img src="https://img.shields.io/badge/CI-GitHub%20Actions-blue?logo=githubactions&logoColor=white" alt="CI on GitHub Actions">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs welcome">
  <img src="https://img.shields.io/badge/Maintained-yes-success" alt="Maintained">
</p>

<div align="center">
  <h3>
    <a href="https://github.com/malikrajat/ai-assistant-reply">Source Code</a>
    •
    <a href="https://github.com/malikrajat/ai-assistant-reply/releases">Releases</a>
    •
    <a href="#quick-start-guide">Install Guide</a>
    •
    <a href="#ai-providers">Providers</a>
    •
    <a href="https://github.com/malikrajat/ai-assistant-reply/issues">Report Issue</a>
  </h3>
</div>

<div align="center">
  <p>
    <strong>Bring Your Own Model</strong> ·
    <strong>Every Composer</strong> ·
    <strong>Review Before Posting</strong> ·
    <strong>Local-Only Data</strong> ·
    <strong>Free &amp; Open Source</strong>
  </p>
</div>

## See It In Action

<div align="center">

  <img src="./public/icons/icon128.png" alt="LinkedIn AI Reply Assistant application icon" width="128" />

</div>

One inline button per composer, one floating button on the field you are already typing in, and
one modal that lets you read, edit and regenerate before anything reaches LinkedIn:

```text
Feed post
┌───────────────────────────────────────────────────────────────────┐
│  💬  Add a comment…                                   ✨ AI Reply  │
└───────────────────────────────────────────────────────────────────┘

┌─ AI Reply ─────────────────────── Professional · 500 chars ──────┐
│ Congratulations on the new role at Apple - the iOS work there is  │
│ in good hands.                                                    │
│                                                                   │
│ [ Insert ]   [ Copy ]   [ Regenerate ]                      [ × ] │
└───────────────────────────────────────────────────────────────────┘
```

The same flow works for comments, LinkedIn messages and InMail, connection-request notes,
"Catch up" greetings and the post composer. The label changes with the surface
(`AI Reply`, `AI Note`, `AI Greeting`, `AI Draft`), and so does the prompt behind it.

## Table of Contents

- [See It In Action](#see-it-in-action)
- [Quick Start](#quick-start)
- [Features](#features)
- [Where It Works](#where-it-works)
- [AI Providers](#ai-providers)
- [Quick Start Guide](#quick-start-guide)
- [Example Workflows](#example-workflows)
- [Documentation](#-documentation)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [Settings Reference](#settings-reference)
- [Privacy & Security](#privacy--security)
- [Permissions](#permissions)
- [Development](#development)
- [Project Structure](#project-structure)
- [Build Pipeline](#why-the-build-has-two-passes)
- [Testing](#testing-examples)
- [CI/CD](#cicd)
- [Troubleshooting](#troubleshooting)
- [Migration Guide](#migration-guide)
- [API & Internals](#api--internals)
- [Best Practices](#best-practices)
- [Performance Optimization](#performance-optimization)
- [FAQ](#faq)
- [Changelog](#changelog)
- [Latest Release](#latest-release)
- [License](#license)
- [Statistics](#statistics)
- [Support This Project](#support-this-project)
- [Support and Community](#support-and-community)
- [Contributing](#contributing)
- [Acknowledgements](#acknowledgements)
- [Other Projects](#other-projects)
- [Author](#author)

## Install & Documentation

| | |
| --- | --- |
| <a href="#quick-start-guide" target="_blank"><img src="https://img.shields.io/badge/Install_Guide-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Install Guide"/></a><br/><br/><sub><b>Build &amp; Load</b></sub><br/><sub>Clone, build, load unpacked — five minutes</sub> | <a href="#ai-providers" target="_blank"><img src="https://img.shields.io/badge/Provider_Setup-1976D2?style=for-the-badge&logo=openai&logoColor=white" alt="Provider Setup"/></a><br/><br/><sub><b>Provider Setup</b></sub><br/><sub>Keys, models and the custom endpoint</sub> |
| <a href="#usage" target="_blank"><img src="https://img.shields.io/badge/Usage_Guide-2E7D32?style=for-the-badge&logo=readthedocs&logoColor=white" alt="Usage Guide"/></a><br/><br/><sub><b>Daily Workflow</b></sub><br/><sub>Comments, DMs, notes, greetings, drafts</sub> | <a href="#troubleshooting" target="_blank"><img src="https://img.shields.io/badge/Troubleshooting-C62828?style=for-the-badge&logo=readthedocs&logoColor=white" alt="Troubleshooting"/></a><br/><br/><sub><b>Fix It Fast</b></sub><br/><sub>Symptoms, causes and the exact fix</sub> |
| <a href="https://github.com/malikrajat/ai-assistant-reply" target="_blank"><img src="https://img.shields.io/badge/GitHub_Repo-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Repository"/></a><br/><br/><sub><b>Source Code</b></sub><br/><sub>Star, fork and contribute</sub> | <a href="https://github.com/malikrajat/ai-assistant-reply/releases" target="_blank"><img src="https://img.shields.io/badge/Releases-181717?style=for-the-badge&logo=github&logoColor=white" alt="Releases"/></a><br/><br/><sub><b>Release History</b></sub><br/><sub>What changed and when</sub> |

## Quick Start

`LinkedIn AI Reply Assistant` is a Manifest V3 Chrome extension that writes LinkedIn comments,
messages, connection notes, congratulations and post drafts with the AI provider **you** choose.
It supports **Gemini, OpenAI, Claude, DeepSeek, Groq, Mistral, OpenRouter, xAI Grok** and any
**OpenAI-compatible endpoint**, including a local server.

It has no backend, no account and no telemetry. Your API key, settings and usage counters stay in
Chrome storage on your machine; the only network call is the one your browser makes directly to
the provider you configured.

### Installation

```bash
git clone https://github.com/malikrajat/ai-assistant-reply.git
cd ai-assistant-reply
npm install
npm run build
```

Then open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked** and select
the generated `dist/` folder. Open the extension settings, pick a provider, paste the key and
press **Test Connection**.

### Basic Usage

1. Click into any LinkedIn text box — a comment, a message, a connection note or the post composer.
2. Click the inline **✨ AI Reply** button, the floating **✨** button, or press `Alt+Shift+G`.
3. Review the generated text in the modal. Edit it, **Regenerate** it, **Copy** it or **Insert** it.
4. Post it yourself. The extension never submits content on your behalf.

```text
Alt+Shift+G  →  generate for the focused text box
Alt+G        →  the same, when Alt+Shift is swallowed by a keyboard-layout switch
```

---

## Features

- **Nine provider options, one interface**: Gemini, OpenAI, Claude, DeepSeek, Groq, Mistral, OpenRouter, xAI Grok and any custom OpenAI-compatible endpoint
- **Per-provider credentials**: a separate key, model and base URL for each provider, so switching models never means re-entering a key
- **Works on every composer**: feed comments, newsletter/article comments, LinkedIn messages and InMail, connection-request notes, "Catch up" greetings, the post composer and any other editable box
- **Surface-aware prompts**: a public comment, a chat message, a 300-character invite note and a structured post are written differently on purpose
- **Inline buttons**: one correctly placed button per surface, labelled `AI Reply`, `AI Note`, `AI Greeting` or `AI Draft`
- **Floating quick button**: a small ✨ button follows the text box you are typing in, and stays hidden when that box already has an inline button
- **Keyboard shortcut**: `Alt+Shift+G` for the focused text box, with an `Alt+G` fallback and a remap option at `chrome://extensions/shortcuts`
- **Review before posting**: edit, regenerate, copy or insert from the modal; nothing is auto-submitted
- **Grounded context chain**: your draft → selected page text → the nearest prose block, never the whole feed
- **Announcement awareness**: posts about a new role, promotion, anniversary or graduation get a congratulation prompt instead of generic commentary
- **Text clean-up**: markdown mentions, bare URLs, zero-width characters, "see more" tails and scraped LinkedIn UI strings are removed before the model sees them
- **Fabrication guardrails**: the prompt forbids inventing names, companies, dates or numbers, and forbids mentioning that the text was AI generated
- **Human-like insertion**: native `insertText` first, word-chunked typing next, a direct DOM fallback last, and a read-back check so a failure is reported instead of hidden
- **Bounded insertion time**: typing delays scale down to a ~4 second budget, so a long reply does not take a long time to appear
- **Tone control**: Professional, Polite, Friendly and Concise, each mapped to a temperature as well as a prompt instruction
- **Character budgets**: 100–1000 characters globally, with LinkedIn's 300-character connection-note cap applied to the prompt automatically
- **Usage tracking and rate limiting**: an adjustable daily request limit (default 50) with a 24-hour reset and a visible counter
- **Local-first privacy**: no analytics, no tracking, no extension backend and no account
- **API key isolation**: providers are called from the service worker; the key is never placed in the page's JavaScript context
- **LinkedIn DOM resilience**: surfaces are classified from selectors *and* `aria-label` / `placeholder` / dialog headings, with a mutation observer for dynamically loaded content
- **Stale-node recovery**: if LinkedIn re-renders a composer, the extension re-resolves the live editor instead of inserting into a detached node
- **Service worker resilience**: keep-alive pings, retry on an inactive worker, and exponential backoff with fail-fast client errors
- **Strict TypeScript**: `strict: true`, typed provider registry and validated settings before anything is persisted
- **Zero runtime dependencies**: the shipped extension is your code plus the browser APIs, not a vendor SDK
- **Two-pass build**: extension pages share chunks; the content script is emitted as one self-contained IIFE because content scripts cannot load chunks at runtime
- **Automated checks**: build verification, an end-to-end DOM smoke test, prompt-quality tests and a type-check gate
- **CI that stores nothing**: builds run on `main` and qualifying tags with no artifacts and no caches

---

## Where It Works

| Surface | Button label | What it writes | Context it reads |
| --- | --- | --- | --- |
| Post comments | `AI Reply` | A comment replying to the post | Post text, author name |
| Newsletter / article comments | `AI Reply` | A comment on the article | Article text and the comment area |
| Messages / InMail | `AI Reply` | The next message in the thread | Last messages in the conversation, recipient name |
| Connection notes | `AI Note` | A personalised invite note (LinkedIn's 300-character cap is enforced) | Profile name and headline |
| Catch up (birthday, work anniversary, new job, education) | `AI Greeting` | A short congratulations message | Card/dialog copy and the occasion |
| Post composer | `AI Draft` | A post draft | The notes/topic you typed in the box |
| Any other text box | `AI Reply` | Ready-to-use text | Whatever you typed, else the surrounding block |

A composer is classified from LinkedIn's selectors first, then from the field's `aria-label`,
`placeholder` or dialog heading. Unknown layouts still get a sensible prompt instead of no
button at all.

---

## AI Providers

Pick the provider in **Full Settings → AI Configuration**. Keys are stored per provider, so you
can switch back and forth without re-entering anything.

The provider dropdown is grouped so you can pick a direct API, a multi-model gateway, a local
server, or a custom endpoint. Keys are stored per provider.

| Group | Provider | API shape | Default model | Where to get a key |
| --- | --- | --- | --- | --- |
| Cloud | Google Gemini | `generateContent` | `gemini-2.5-flash` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| Cloud | DeepSeek | OpenAI-compatible | `deepseek-chat` | [platform.deepseek.com](https://platform.deepseek.com/api_keys) |
| Cloud | OpenAI | OpenAI-compatible | `gpt-4o-mini` | [platform.openai.com](https://platform.openai.com/api-keys) |
| Cloud | Anthropic Claude | Anthropic Messages | `claude-3-5-sonnet-latest` | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| Cloud | Mistral AI | OpenAI-compatible | `mistral-small-latest` | [console.mistral.ai](https://console.mistral.ai/api-keys) |
| Cloud | xAI Grok | OpenAI-compatible | `grok-2-latest` | [console.x.ai](https://console.x.ai) |
| Cloud | Perplexity | OpenAI-compatible | `sonar` | [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) |
| Cloud | Moonshot AI (Kimi) | OpenAI-compatible | `moonshot-v1-8k` | [platform.moonshot.ai](https://platform.moonshot.ai/console/api-keys) |
| Gateway | Groq | OpenAI-compatible | `llama-3.3-70b-versatile` | [console.groq.com](https://console.groq.com/keys) |
| Gateway | OpenRouter | OpenAI-compatible | `openai/gpt-4o-mini` | [openrouter.ai/keys](https://openrouter.ai/keys) |
| Gateway | OpenCode Console (formerly Zen) | OpenAI-compatible | `gpt-5.4-mini` | [opencode.ai/console](https://opencode.ai/console) |
| Gateway | Together AI | OpenAI-compatible | `meta-llama/Llama-3.3-70B-Instruct-Turbo` | [api.together.ai](https://api.together.ai/settings/api-keys) |
| Gateway | Fireworks AI | OpenAI-compatible | `accounts/fireworks/models/llama-v3p3-70b-instruct` | [fireworks.ai](https://fireworks.ai/account/api-keys) |
| Gateway | Hugging Face Inference | OpenAI-compatible | `meta-llama/Llama-3.3-70B-Instruct` | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| Gateway | GitHub Models | OpenAI-compatible | `openai/gpt-4.1-mini` | [github.com/settings/tokens](https://github.com/settings/tokens) |
| Gateway | Cerebras | OpenAI-compatible | `llama-3.3-70b` | [cloud.cerebras.ai](https://cloud.cerebras.ai/platform/api-keys) |
| Local | Ollama | OpenAI-compatible | `llama3.2` | no key needed |
| Local | LM Studio | OpenAI-compatible | `local-model` | no key needed |
| Local | vLLM / self-hosted | OpenAI-compatible | your choice | optional |
| Custom | Custom (OpenAI-compatible) | OpenAI-compatible | your choice | any endpoint |

Suggested models are offered as datalist suggestions, but the **Model** field is free text — any
model that provider serves can be typed in. **Fetch models** asks the provider for its live model
list and filters out embedding, image and audio models. For Ollama it lists the models you have
pulled; for OpenCode it uses the Console model-list endpoint; for Gemini it strips the `models/`
prefix automatically.

Notes:

- Every provider except Gemini and Claude uses the OpenAI-compatible `/chat/completions` shape.
  Custom endpoints use the same shape, which is what makes local models work.
- **OpenCode Console** (previously Zen) serves all curated text models through one
  OpenAI-compatible endpoint. Free chat models are only available inside OpenCode; use a paid
  model from another client.
- **Local Ollama**: run `ollama serve` and `ollama pull llama3.2`, select **Ollama (local)**, then
  click **Fetch models**. `http://localhost/*` is already declared in the manifest, so Chrome does
  not need to prompt for the default endpoint. Ollama *also* has to allow the extension's origin:
  set `OLLAMA_ORIGINS=chrome-extension://*` and restart Ollama. Point the Base URL field at another
  host/port if your Ollama server is not on the default one.
- **Test Connection** sends a real sample post ("starting a new position as a Senior Software
  Engineer at Apple") and shows the beginning of the reply, so you can check both the key and
  the quality before using it on LinkedIn.
- For custom hosts, Chrome asks for permission to reach that origin when you save. The manifest's
  optional `https://*/*` and `http://*/*` permissions back that prompt; loopback HTTP hosts are
  declared up front.
- The output budget scales with the character limit and keeps at least 1,024 tokens, leaving room
  for reasoning models such as Gemini 2.5 and `deepseek-reasoner` to think before writing.
- Temperature follows the tone: Concise `0.3`, Professional `0.5`, Polite `0.7`, Friendly `0.8`.
- Client errors (bad key, unknown model, no credits) fail immediately instead of retrying.
  Network failures and 5xx responses are retried up to three times with exponential backoff.

---

## Quick Start Guide

### 1. Installation

Choose your preferred package manager:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

Then build the extension:

```bash
npm run build
```

The build runs `tsc --noEmit`, both Vite passes, the build verifier, the DOM smoke test and the
prompt tests. If any step fails, treat the build as broken — read the failure instead of loading
it.

### 2. Load It in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder
5. Pin the extension if you want quick access to the popup

### 3. Connect a Provider

1. Click the extension icon, then **Full Settings**
2. Choose an **AI Provider** from the grouped dropdown
3. Paste that provider's API key — the key is saved per provider (local servers need none)
4. Leave the default model, click **Fetch models**, or type another model name
5. Click **Test Connection** and confirm you get real text back
6. Choose tone, maximum length, default action, daily limit and button preferences
7. Click **Save Settings**

For a local server, choose **Ollama (local)**, **LM Studio (local)** or **vLLM / self-hosted**.
The Base URL field is shown for those and for **Custom**; set it to an OpenAI-compatible root such
as `http://localhost:11434/v1`, then click **Fetch models**. Loopback HTTP hosts are already
allowed in the manifest, so no Chrome prompt appears. For Ollama, set
`OLLAMA_ORIGINS=chrome-extension://*` and restart Ollama first — otherwise it rejects the
extension's origin. An API key may be left empty when the endpoint does not need one.

### 4. Generate Your First Reply

1. Open LinkedIn and click into a comment box or an "Add a comment…" control
2. Click **✨ AI Reply** (or focus the box and press `Alt+Shift+G`)
3. Wait for the modal — the button shows a loading state while the provider replies
4. Edit the text if needed, then **Insert**, **Copy** or **Regenerate**

The same flow works in messaging, connection-request notes, Catch-up greetings and the post
composer. The prompt adapts to the surface: a DM reads like a chat message, an invite note is
budgeted to the 300-character cap, and a post draft gets structure.

### 5. Advanced Configuration

Everything lives in `chrome.storage.sync` under the `settings` key. This is the shape written for
the selected provider (every other provider also gets an empty entry):

```json
{
  "provider": "openrouter",
  "providers": {
    "openrouter": {
      "apiKey": "sk-or-...",
      "model": "anthropic/claude-3.5-sonnet",
      "baseUrl": "https://openrouter.ai/api/v1"
    }
  },
  "apiKey": "",
  "tone": "professional",
  "maxLength": 500,
  "defaultAction": "insert",
  "rateLimit": 50,
  "stealthMode": true,
  "floatingButton": true
}
```

Settings are normalised on read: every provider gets an entry, missing models fall back to that
provider's default, and a key from an older Gemini-only install is migrated into
`providers.gemini.apiKey` automatically.

### 6. Programmatic Control

The extension's own pages use the storage helpers directly, which is also the supported way to
inspect or reset state from an extension context:

```ts
import {
  getSettings,
  saveSettings,
  getUsage,
  clearAllData
} from './utils/storage.js'

const settings = await getSettings()
settings.tone = 'friendly'
settings.maxLength = 300
await saveSettings(settings)

const usage = await getUsage()
console.log(`${usage.count}/${usage.limit}, resets ${new Date(usage.resetDate)}`)

await clearAllData() // settings + usage, nothing else
```

Validation runs before a save: an unknown provider, an out-of-range length, an invalid tone, an
invalid default action or a non-boolean floating-button flag throws instead of being written.

### 7. Console Output & Diagnostics

The content script logs what it found and what it sent:

```text
[Content Script] LinkedIn AI Reply Assistant loaded
[Content Script] Composers: 3, comment boxes: 2, comment triggers: 1, buttons added: 6
[Content Script] Scan: editables seen: 4, accepted: 3, skipped (...)
[Composers] Comment context: 210 chars (source: nearby block (level 2))
[Content Script] Generating for surface=comment mode=reply (210 chars)
[Service Worker] Starting reply generation...
[API] Prompt sent to Gemini (gemini-2.5-flash): ...
[API] Reply received: ...
[Service Worker] Reply generated successfully in 1240ms (146 chars)
```

The prompt and the raw reply are logged on purpose, in development and in packed builds, so a bad
reply can be traced to the exact context the model was given. They appear in the **service
worker** console (`chrome://extensions/` → the extension → **service worker**), not in the page's
console.

---

## Example Workflows

| Scenario | What you do | What the assistant writes |
| --- | --- | --- |
| **Congratulate a new role** | Comment on an announcement post, press `Alt+Shift+G` | A grounded 1–2 sentence congratulations that names the role or company |
| **Reply to a technical post** | Click **AI Reply** under the post | A specific reaction or insight, with no "Great post!" filler |
| **Follow up in a DM** | Open the conversation, focus the message box | A conversational next message that continues the thread |
| **Send a connection note** | Open **Connect → Add a note** | A warm note inside LinkedIn's 300-character limit |
| **Draft a post from notes** | Focus the post composer and type a topic | A structured draft with a strong first line and short paragraphs |
| **Answer a newsletter** | Comment on the article | A reply grounded in the article and comment area |
| **Say happy birthday** | Open the Catch-up card | A short personal congratulations that mentions the occasion |
| **Use an unknown layout** | Select the source text, then press `Alt+G` | A reply grounded in the selection, no scraping required |

Every result lands in the modal first. The extension never clicks **Post**, **Send** or
**Comment** for you.

---

## 📖 Documentation

| Documentation | Description |
| --- | --- |
| **[Quick Start](#quick-start)** | Install, connect a provider, first reply |
| **[Where It Works](#where-it-works)** | Every supported composer and what each one reads |
| **[AI Providers](#ai-providers)** | Provider table, default models and key links |
| **[Usage](#usage)** | The daily workflow, modal actions and popup |
| **[Settings Reference](#settings-reference)** | Every setting, default and validation rule |
| **[Privacy & Security](#privacy--security)** | What leaves the machine, and what does not |
| **[Permissions](#permissions)** | Why each Chrome permission exists |
| **[Development](#development)** | Project structure, commands and the two-pass build |
| **[Testing](#testing-examples)** | Automated checks and the manual checklist |
| **[CI/CD](#cicd)** | Branch/tag rules and the zero-storage policy |
| **[Troubleshooting](#troubleshooting)** | Symptoms and their exact causes |
| **[Migration Guide](#migration-guide)** | From the Gemini-only build and from manual copy/paste |
| **[API & Internals](#api--internals)** | Message contract, modules and key exports |
| **[FAQ](#faq)** | Short answers to the questions that come up most |
| **[GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md)** | How to change branches, tags and triggers |

---

## Installation & Setup

For a step-by-step first install, see the [Quick Start Guide](#quick-start-guide).

### Prerequisites

- **Node.js 18+** (20 LTS recommended — this is what CI uses)
- **npm** (or pnpm / yarn / bun)
- **Chrome 91+** or another Chromium-based browser with Manifest V3 support
- An API key for at least one supported provider, or an OpenAI-compatible endpoint

The extension has no runtime dependencies. `typescript`, `vite`, `terser` and `@types/chrome` are
build-time only.

### Build from source

```bash
git clone https://github.com/malikrajat/ai-assistant-reply.git
cd ai-assistant-reply
npm install
npm run build
```

`npm run build` produces:

```text
dist/
├── manifest.json
├── contentScript.js    # single self-contained IIFE
├── serviceWorker.js    # ES module
├── options.html / options.js / options.css
├── popup.html / popup.js / popup.css
├── styles.css
└── icons/
```

Load `dist/` with **Load unpacked**. The repository's supported install path is the unpacked
build, and it is always the code in the branch you built.

### Update an existing install

```bash
git pull
npm install
npm run build
```

Then click the reload icon on the extension card at `chrome://extensions/` and **hard-refresh**
every open LinkedIn tab (`Ctrl+Shift+R` / `Cmd+Shift+R`). A tab that was already open keeps the
old content script until it is refreshed.

### Verify the build without a browser

```bash
npm run verify       # required files are present in dist/
npm run smoke        # end-to-end content-script smoke test
npm run test:prompt  # prompt quality and provider request shapes
```

### Remove the extension and its data

1. Remove it at `chrome://extensions/`
2. Extension storage is removed with the extension. To reset the daily counter first, use
   **Reset Usage Counter** on the options page; to clear settings and usage together, call
   `clearAllData()` from an extension context before removing it.

---

## Usage

### Inline Buttons

An inline button is injected for:

- feed comments and comment boxes that have not opened their editor yet
- newsletter/article comment areas
- the messaging composer and InMail
- connection-request notes
- Catch-up greeting cards
- the post composer

Buttons are placed next to the field's own toolbar, not inside the editor region. The extension
checks the container and its nearest ancestors before injecting, so the same field never gets two
buttons.

### Quick Generate

- Click into a LinkedIn text box and press `Alt+Shift+G`
- If `Alt+Shift` is captured by the operating system's keyboard-layout switch, press `Alt+G`
- Or click the floating **✨** button that follows the focused text box
- Remap the shortcut at `chrome://extensions/shortcuts`

The shortcut works for the focused box, falling back to the most recently focused one. If no
LinkedIn composer is active, a toast asks you to click into a field first.

### Review & Insert

The modal shows the generated text with the current tone and character budget. From there:

| Action | What happens |
| --- | --- |
| **Insert** | Writes into the composer the request came from and verifies the text landed |
| **Copy** | Copies to the clipboard and closes the modal |
| **Regenerate** | Re-runs the same request with the same context for a different take |
| **Close / ×** | Discards the result; nothing is written |

**Default action** controls whether the primary path is auto-insert or manual copy. Either way,
the modal appears first — the setting changes the emphasis, not the review step.

### Popup

Click the extension icon to see:

- today's usage and the configured daily limit, with a progress bar
- the provider and model currently answering
- a quick tone selector that saves immediately

### Full Settings

The options page configures the provider, key, model, custom base URL, tone, maximum length,
default action, daily limit, stealth mode and floating button. It also shows usage, the reset
time, a manual counter reset and a **Test Connection** button.

---

## Settings Reference

### Reply and provider settings

| Setting | Type | Default | Range / values | Description |
| --- | --- | --- | --- | --- |
| `provider` | string | `"gemini"` | any ID in `LLM_PROVIDERS` (20 presets) | Which provider answers |
| `providers[id].apiKey` | string | `""` | provider key | Stored per provider; may be empty for a local/keyless endpoint |
| `providers[id].model` | string | provider default | free text | Any model that provider serves; **Fetch models** fills the suggestions |
| `providers[id].baseUrl` | string | provider base | URL | Editable for local and **Custom** presets; OpenAI-compatible root |
| `apiKey` | string | `""` | — | Legacy single Gemini key, kept so old installs keep working |
| `tone` | string | `"professional"` | `professional` \| `polite` \| `friendly` \| `concise` | Controls prompt wording and temperature |
| `maxLength` | number | `500` | 100–1000 | Character budget for the generated text |
| `defaultAction` | string | `"insert"` | `insert` \| `copy` | Primary action in the modal |
| `rateLimit` | number | `50` | 1–10,000 (options input caps at 1,000) | Daily request limit |
| `stealthMode` | boolean | `true` | `true` / `false` | Word-chunked typing vs an instant write |
| `floatingButton` | boolean | `true` | `true` / `false` | Show the ✨ button on the focused text box |

### Storage layout

| Key | Storage area | Contents |
| --- | --- | --- |
| `settings` | `chrome.storage.sync` | Provider, keys, models, tone, lengths, limits and toggles |
| `usage` | `chrome.storage.local` | `{ count, resetDate, limit }` — the daily counter |

`chrome.storage.sync` follows the signed-in Chrome profile. If you use Chrome sync, the settings
(including provider keys) sync to your other signed-in Chrome instances. Usage stays on the
machine where it was recorded.

### Surface character budgets

| Surface | Effective budget |
| --- | --- |
| Connection note (`invite`) | `min(maxLength, 300)` — LinkedIn's hard cap |
| Comment, message, greeting, post, generic | `maxLength` |

### Validation rules

Settings are validated before they are written. Invalid values throw instead of being saved:

- the provider must be a known provider ID
- the tone must be one of the four supported tones
- `defaultAction` must be `insert` or `copy`
- `maxLength` must be between 100 and 1000
- `rateLimit` must be between 1 and 10,000
- a non-empty legacy `apiKey` must be at least 10 characters
- provider objects must contain string `apiKey`, `model` and `baseUrl` values when those fields
  are present

---

## Privacy & Security

- **No extension backend**: there is no server, no account and no analytics endpoint in this
  project. The only outbound requests are the provider calls your browser makes with your key.
- **No telemetry**: no usage pings, crash reporting, fingerprinting or tracking pixels.
- **Local settings**: settings live in `chrome.storage.sync`; usage lives in
  `chrome.storage.local`.
- **API key isolation**: provider calls run in the service worker. The key is not injected into
  the page or exposed on `window`; content scripts run in an isolated world.
- **Minimal data**: only the text needed to write the reply is sent — the scraped or selected
  context, your draft when present, the surface, the tone and the character budget.
- **No post history stored**: scraped post text, prompts and replies are not persisted by the
  extension. They exist in memory for the request and in the service worker console log.
- **Review first**: generated text is shown in a modal. The extension never submits a comment,
  message, connection request or post.
- **No remote code**: the extension ships its own bundles. It does not load scripts, styles or
  modules from a remote origin.
- **Narrow host access**: LinkedIn, the built-in provider hosts and loopback HTTP hosts are
  declared up front. Other custom endpoints get a runtime permission prompt for that origin only.

### What is logged

For debugging, the service worker logs the exact prompt and the raw reply
(`[API] Prompt sent to …`, `[API] Reply received: …`). These logs are local to the browser and are
visible to anyone who can open the extension's service worker console on that machine. They are
not uploaded anywhere. If you share a screen or export browser diagnostics, clear that console
first.

### Responsible use

This is a writing assistant, not an automation bot. It does not scrape profiles in bulk, send
connection requests, post content or run on a schedule. You remain responsible for LinkedIn's
terms, your provider's terms and the accuracy of anything you publish.

---

## Permissions

| Permission | Why it exists |
| --- | --- |
| `storage` | Persist settings and the daily usage counter |
| `activeTab` | Grants temporary access to the active tab when the user invokes the extension; content-script access itself comes from the LinkedIn host permission |
| `https://www.linkedin.com/*`, `https://linkedin.com/*`, `https://*.linkedin.com/*` (host) | Inject buttons, read the page's composers and insert text |
| `http://localhost/*`, `http://127.0.0.1/*` (host) | Local Ollama, LM Studio, vLLM and other loopback OpenAI-compatible servers |
| `https://generativelanguage.googleapis.com/*` (host) | Google Gemini requests |
| `https://api.openai.com/*` (host) | OpenAI requests |
| `https://api.anthropic.com/*` (host) | Anthropic Claude requests |
| `https://api.deepseek.com/*` (host) | DeepSeek requests |
| `https://api.groq.com/*` (host) | Groq requests |
| `https://api.mistral.ai/*` (host) | Mistral requests |
| `https://openrouter.ai/*` (host) | OpenRouter requests |
| `https://opencode.ai/*` (host) | OpenCode Console chat and model-list requests |
| `https://api.x.ai/*` (host) | xAI Grok requests |
| `https://api.perplexity.ai/*`, `https://api.moonshot.ai/*`, `https://api.together.xyz/*`, `https://api.fireworks.ai/*`, `https://router.huggingface.co/*`, `https://models.github.ai/*`, `https://api.cerebras.ai/*` (host) | Other built-in OpenAI-compatible presets |
| `https://*/*`, `http://*/*` (optional host) | Requested at runtime, for one origin, when you save/test/fetch models on a custom endpoint outside localhost |
| `commands` (manifest) | Register `Alt+Shift+G`; remappable at `chrome://extensions/shortcuts` |
| `web_accessible_resources` (manifest, not a permission) | Let the content script's stylesheet load on LinkedIn pages |

There is no `tabs` permission, no `scripting` permission, no `<all_urls>` host permission and no
externally connectable surface.

---

## Development

### Project Structure

```text
ai-assistant-reply/
├── src/
│   ├── contentScript.ts        # Injects buttons, floating button, shortcut and modal flow
│   ├── serviceWorker.ts        # Message router, provider calls, usage, commands, keep-alive
│   ├── styles.css              # Content-script styles
│   ├── components/
│   │   ├── Button.ts           # Inline + floating button components and states
│   │   ├── ReplyModal.ts       # Review modal: insert, copy, regenerate, close
│   │   └── ReplyModal.css      # Modal styles (documentation copy)
│   ├── options/
│   │   ├── options.html        # Full settings page
│   │   ├── options.ts          # Provider registry wiring, validation, test connection
│   │   └── options.css         # Options page styles
│   ├── popup/
│   │   ├── popup.html          # Quick settings popup
│   │   ├── popup.ts            # Usage, provider label and quick tone switch
│   │   └── popup.css           # Popup styles
│   ├── types/
│   │   └── index.ts            # Settings, messages, composer and provider types
│   └── utils/
│       ├── api.ts              # Prompt builder + Gemini/Anthropic/OpenAI-compatible callers
│       ├── composers.ts        # Finds and classifies every text box, collects context
│       ├── dom.ts              # LinkedIn DOM selectors and post extraction
│       ├── providers.ts        # Provider registry: models, base URLs, key links
│       ├── rateLimit.ts        # Daily counter, reset window and remaining usage
│       ├── storage.ts          # chrome.storage helpers and settings migration
│       ├── text.ts             # Scraped-text cleanup, news detection, UI-noise filtering
│       ├── typing.ts           # Native/insertion fallbacks and read-back verification
│       └── validation.ts       # Settings, key, text and URL validation
├── public/
│   ├── manifest.json           # Manifest V3 definition
│   └── icons/                  # 16/48/128 px icons + source SVG
├── scripts/
│   ├── dev.js                  # Both build passes in watch mode
│   ├── verify-build.js         # Checks every required dist/ file
│   ├── smoke-test.js           # Fake LinkedIn DOM → boot → generate → insert
│   └── prompt-test.js          # Prompt cleanup, grounding and provider request shapes
├── .github/workflows/ci.yml    # Build on main and qualifying tags
├── GITHUB_ACTIONS.md           # How to change the CI triggers safely
├── dist/                       # Build output (generated)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### Development Commands

> CI (GitHub Actions) is configured to run **only for `main` and tags created from `main`**,
> and it stores no artifacts or caches. See [GITHUB_ACTIONS.md](GITHUB_ACTIONS.md) for what to
> change if you ever need it on another branch, tag pattern, or for pull requests.

```bash
# Install dependencies
npm install

# Development build with watch mode (watches both build passes)
npm run dev

# Production build (both passes + verify + smoke + prompt tests)
npm run build

# Clean build with explicit production mode
npm run build:prod

# Rebuild only the content script bundle
npm run build:content

# Verify the dist/ layout
npm run verify

# Run the built content script against a fake LinkedIn DOM
npm run smoke

# Test prompt cleanup, grounding and provider request shapes
npm run test:prompt

# Type checking
npm run type-check

# Remove dist/
npm run clean
```

### Why the build has two passes

The content script is bundled on its own into a single self-contained
`dist/contentScript.js`. Content scripts are injected as classic scripts and
cannot fetch extra chunks at runtime, so a code-split (or dynamically imported)
content script fails at runtime - that is what used to make **Insert** fail while
**Copy** still worked.

The first pass builds the service worker, options page, popup and stylesheet. Those run as ES
modules, so shared chunks are fine. The second pass (`--mode content`) emits an IIFE with
`inlineDynamicImports: true` and `format: 'iife'`.

Both passes keep `drop_console: false` on purpose: the prompt, the reply and the insertion
warnings have to remain readable in a packed build.

### Making Changes

1. Make your changes in `src/` (or in `public/` for the manifest and icons)
2. Run `npm run build` — it type-checks, builds, verifies and tests
3. Reload the extension on `chrome://extensions/`
4. Hard-refresh LinkedIn and test on the real surfaces

For rapid iteration, run `npm run dev` and reload the extension card after each successful pass.

### Adding a Provider

The provider registry is the single source of truth:

1. Add an entry to `LLM_PROVIDERS` in `src/utils/providers.ts`. Required: `id`, `label`, `group`
   (`Cloud providers`, `Model gateways`, `Local & self-hosted`, `Custom`), `kind` (`gemini`,
   `anthropic` or `openai`), `baseUrl`, `defaultModel`, `suggestedModels`, `keyUrl` and `keyHint`.
   Optional: `allowEmptyKey`, `allowBaseUrlEdit`, `modelListUrl`, `modelListKind` and `help`.
2. Add a host permission for the provider's API origin in `public/manifest.json` (or rely on the
   optional `https://*/*` / `http://*/*` runtime prompt).
3. Add a request-shape assertion to `scripts/prompt-test.js` if the provider needs one.
4. Run `npm run build` — type-check, prompt tests and the smoke test all run.

The `LLMProvider` type, storage defaults, validation, grouped options dropdown, popup label and
**Fetch models** button are derived from the registry. Nothing else needs to be wired by hand for
a provider that speaks one of the three supported API shapes.

### Code Conventions

- strict TypeScript; no `any` unless a DOM API forces it
- every user-facing string goes through the modal, toast or button helpers, not `alert`
- scraping never assumes a single LinkedIn class name — combine selectors, attributes and text
- insertion must be verified; a silent failure is treated as a bug
- provider errors are converted to actionable messages via `toFriendlyError()`
- any new setting needs a validation rule, a default and a place in the options page

---

## Testing Examples

### Build-Time Checks

| Check | Command | What it proves |
| --- | --- | --- |
| Type safety | `npm run type-check` | `strict` TypeScript compiles with no errors |
| Build layout | `npm run verify` | Every required file exists in `dist/` |
| End-to-end smoke | `npm run smoke` | The built content script boots, injects a button, generates, opens the modal and inserts |
| Prompt quality | `npm run test:prompt` | Clean-up, grounding rules, announcement handling and provider request shapes |

### End-to-End Smoke Test

`scripts/smoke-test.js` does not need Chrome. It loads `dist/contentScript.js` into a fake DOM
shaped like a LinkedIn feed post, stubs the extension messaging layer, and asserts:

- the script boots without throwing
- an inline button is injected
- clicking it produces a request
- the modal appears with the generated reply
- **Insert** actually writes the text into the editor

```bash
npm run build   # build first
npm run smoke
```

This is the test that catches the failure mode where **Copy** works but **Insert** silently
writes nothing.

### Prompt Tests

`npm run test:prompt` transpiles the real prompt modules and checks the string that would reach
the provider, including:

- markdown mentions, URLs, zero-width characters and "see more" tails are removed
- the extension's own UI strings ("AI Reply", "Generating…", "Regenerate", usage counters) never
  become context
- announcement posts get the grounded congratulations instruction
- the output rules forbid invented names, companies, dates and numbers
- the provider request bodies match Gemini, Anthropic and OpenAI-compatible shapes

### Manual Testing Checklist

#### Setup Checklist

- [ ] Extension loads without errors
- [ ] Options page is accessible
- [ ] A provider key can be saved
- [ ] Settings persist across browser restarts
- [ ] **Test Connection** returns text for the selected provider
- [ ] An HTTPS custom endpoint prompts for host permission once

#### Button Injection

- [ ] Buttons appear on feed posts
- [ ] Buttons appear on comment boxes
- [ ] Button appears in the message composer
- [ ] Button appears on the connection-request note box
- [ ] Button appears in the post composer
- [ ] Button appears in Catch-up greeting cards
- [ ] Buttons appear on dynamically loaded content
- [ ] No duplicate buttons
- [ ] Buttons are styled appropriately
- [ ] Floating quick button follows the focused text box
- [ ] Floating quick button hides when the setting is off
- [ ] Floating button does not stack on a composer with an inline button

#### Shortcut & Quick Generate

- [ ] `Alt+Shift+G` generates for the focused text box
- [ ] `Alt+G` works when `Alt+Shift` is captured by the OS
- [ ] Shortcut works in the message composer
- [ ] Regenerate replaces the text in the modal
- [ ] Connection note stays within LinkedIn's 300-character cap

#### Reply Generation

- [ ] Clicking a button triggers an API call
- [ ] Loading state is displayed
- [ ] Generated reply appears in the modal
- [ ] Different tones produce different results
- [ ] Max length is respected
- [ ] A keyless custom endpoint still works

#### Reply Insertion

- [ ] Insert populates the comment box
- [ ] Copy copies to the clipboard
- [ ] The reply can be edited before inserting
- [ ] Cancel closes the modal without writing anything
- [ ] Insert works after LinkedIn re-renders the composer

#### Usage Tracking

- [ ] Usage count increments
- [ ] Rate limit is enforced
- [ ] Counter resets after 24 hours
- [ ] Usage is displayed in the popup and options page
- [ ] Manual reset works

#### Error Handling

- [ ] Invalid API key shows a provider-specific error
- [ ] Network errors are retried, then reported
- [ ] Rate limit shows the time until reset
- [ ] Empty post text is handled
- [ ] A blocked custom host shows the permission hint

### Testing on LinkedIn

1. Navigate to [LinkedIn Feed](https://www.linkedin.com/feed/)
2. Scroll through posts and verify buttons appear
3. Click a button and test reply generation
4. Try different tones and verify results
5. Test copy and insert on a comment, a DM and a connection note
6. Verify the usage counter updates in the popup

---

## CI/CD

The repository ships one workflow: [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).
The full explanation — including how to change branches, tags, add pull requests or switch to
pnpm — lives in [GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md).

| Trigger | Workflow starts? | Build runs? |
| --- | --- | --- |
| Push to `main` | Yes | Yes |
| Push to any other branch | No | No |
| Tag created from a commit on `main` | Yes | Yes |
| Tag not on `main` | Yes | No — the `guard` job rejects it |
| Pull request | No — there is no `pull_request` trigger | No |
| Manual run | No — there is no `workflow_dispatch` trigger | No |

The build runs on Node 20 with `npm ci` and then `npm run build`, which includes the type-check,
both Vite passes, build verification, the smoke test and the prompt tests.

**Nothing is stored.** The workflow never calls `actions/upload-artifact` and never uses
`actions/cache`, so no artifacts and no caches survive a run. It also needs **no secrets**: the
provider tests stub the HTTP layer, and every real key is supplied by the user inside the
extension.

---

## Troubleshooting

### Common Issues

#### Issue: the extension does not load

- Ensure you have run `npm run build`
- Check that `dist/` exists and contains `manifest.json`, `contentScript.js` and `serviceWorker.js`
- Verify **Developer mode** is enabled in Chrome
- Read the error card on `chrome://extensions/` — a missing manifest field or icon is named there
- Check the service worker console for startup errors

#### Issue: buttons do not appear

- Refresh the LinkedIn page
- Confirm the extension is enabled
- Verify the content script is injected (DevTools → Sources → Content scripts)
- Check that the tab was hard-refreshed after the last build
- LinkedIn may have changed its DOM structure; the console logs what was skipped and why

#### Issue: nothing happens on LinkedIn (no button at all)

This means the content script is not running in that tab. Check in this order:

1. `npm run build` — the build runs a smoke test that fails loudly if the bundle is broken
2. Reload the extension on `chrome://extensions/` (the reload icon on the extension card)
3. **Hard-refresh the LinkedIn tab** (`Ctrl+Shift+R`). Tabs that were already open keep the old
   content script until you refresh them
4. Open DevTools on the LinkedIn page and confirm you see
   `[Content Script] LinkedIn AI Reply Assistant loaded`
   plus `[Content Script] Composers: X, comment boxes: Y, comment triggers: Z, buttons added: N`
   and `[Content Script] Scan: editables seen: N, accepted: M, skipped (...)`

If the logs are missing entirely, the script was not injected — re-load the unpacked `dist`
folder. If the logs appear but `buttons added` is 0 on a page with a text box, send both log
lines along with the page you are on: the `Scan:` line says exactly what was skipped and why.

#### Issue: "Could not read the post text"

The console says which source was used, so this tells you what happened:

```text
[Composers] Comment context: 210 chars (source: nearby block (level 2))
[Composers] Comment context: 0 chars (source: none)
```

- `post container` / `nearby block` — the post text was found and sent
- `page selection` — nothing was scraped, so the text you had selected was used
- `none` — nothing readable was found. Select the post text and press `Alt+G`; that always works

Post text is looked up without depending on LinkedIn's class names: the extension first tries the
known post containers, then walks up from the comment box to the nearest prose block that is not
part of a comment thread, a navigation bar or the extension's own UI. Blocks that are only UI
labels ("Like Comment Share Repost Send") are rejected rather than sent as the post.

#### Issue: API errors

- Verify the key belongs to the **currently selected provider** — switching providers swaps the
  key and model together
- Click **Test Connection** in options; it reports the provider's own error text
- Check the provider's dashboard for quota, billing and model access
- Ensure you have internet connectivity
- Check the **service worker** console for the exact request and response

#### Issue: "rejected the API key" / 401

- Re-copy the key; trailing spaces are trimmed, but an incomplete paste is not repaired
- Confirm the key was created for that provider, not for a different service
- For Anthropic, the extension sends the browser-access header Anthropic requires; a key that
  works in a server SDK should still work here
- For OpenRouter, keys normally start with `sk-or-`

#### Issue: "does not recognise that model name"

The **Model** field accepts free text, so a typo or a retired model name reaches the provider
verbatim. Pick one of the suggested models from the datalist, or copy the exact ID from the
provider's model list.

#### Issue: "denied the request" / 403 on a local endpoint

- Chrome side: loopback hosts (`http://localhost/*`, `http://127.0.0.1/*`) are already granted in
  the manifest. For a custom non-localhost endpoint, re-save the provider and accept the Chrome
  host-permission prompt.
- Ollama side: Ollama rejects browser-extension origins by default. Set
  `OLLAMA_ORIGINS=chrome-extension://*`, quit Ollama from the system tray, then start it again.
  In Windows PowerShell:

  ```powershell
  [Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS', 'chrome-extension://*', 'User')
  ```

  Restart any terminal running `ollama serve` as well.
- Confirm the **Base URL** ends at the API root (`http://localhost:11434/v1`), not at a full
  endpoint path.

#### Issue: "account has no credits left" / 402

The provider rejected the request before writing anything. Add credit in that provider's
dashboard or switch to another provider in settings.

#### Issue: Insert does nothing (Copy works)

- Rebuild with `npm run build`, then reload the extension on `chrome://extensions/`
- `dist/contentScript.js` must be a single file with no `import` statements — a chunked content
  script cannot run
- Open the page's DevTools console and look for `[Typing]` warnings; they name the editor that
  refused the text
- If LinkedIn re-rendered the text box, the extension re-resolves it and tells you instead of
  failing silently

#### Issue: duplicate buttons on the same field

A stale content script from an older build is still running. Reload the extension and hard-refresh
the tab. If it persists, check that the field is not matching two surface selectors — the
extension guards against stacking, but a stale DOM node can defeat the check.

#### Issue: the shortcut does nothing

- Click into a text box first; the shortcut targets the focused composer, then the last focused one
- Try `Alt+G`; on Windows, `Alt+Shift` is the keyboard-layout switch and can swallow the combo
- Check `chrome://extensions/shortcuts` and confirm `Alt+Shift+G` is assigned
- If the command is unassigned, Chrome does not deliver it; assign it there

#### Issue: settings will not save

Validation fails before writing. The options page surfaces the reason; the common ones are an
unknown provider, a max length outside 100–1000, a rate limit outside 1–10,000, or a non-string
key/model/base URL. An empty key is allowed so you can configure gradually.

#### Issue: an update changed nothing

The extension reload and the LinkedIn tab refresh are separate steps. Reload the extension card,
then refresh the tab; if the old behavior persists, hard-refresh it.

#### Issue: rate limit reached

- Check your current usage in the popup
- Wait for the counter to reset (the options page shows the time remaining)
- Increase the daily limit in settings if needed
- Manually reset the counter on the options page

#### Issue: provider logs appear in the extension console, not the page console

The service worker is a separate JavaScript context with its own console. Provider calls, prompt
logs and keep-alive messages appear there, not in the LinkedIn page console. The page console only
shows content-script logs.

### Reply Quality

- Post text is scraped from LinkedIn's current containers, then stripped of markdown mentions,
  URLs, zero-width characters and "see more" tails before it reaches the model
- The extension's own UI never reaches the model: "AI Reply", "Generating...", "Regenerate" and
  usage counters are filtered out of scraped text, and the context is read *before* the button
  switches to its loading label
- Context is collected as a chain: your draft → text you have selected on the page → the nearest
  ancestor block with real text. Composers are classified from class names *and* their
  aria-label/placeholder/dialog heading, so unknown layouts still get a sensible prompt. The whole
  feed is deliberately never used as context, since that produces off-topic replies
- Generated text is budgeted by surface: the connection-note prompt asks for no more than 300
  characters, while other surfaces use your `maxLength`. The model is instructed to comply; the
  reply is not silently truncated after the fact.

### Manual Context (works on any surface)

Select the text you want answered (a post, a message, a paragraph in a newsletter) and press
`Alt+Shift+G` or `Alt+G`. The selection is used as the context, so this works even on layouts the
extension does not recognise. The page console logs which source was used:

```text
[Composers] Generic composer context - draft: 0, selection: 180, nearby: 0
```

- Announcement posts (new role, promotion, anniversary, graduation) get a grounded
  congratulation instruction that names the role/company instead of generic commentary, plus an
  explicit ban on customer-service wording ("we have received...", "we will let you know...") and
  an example of the intended shape
- The prompt forbids inventing names, companies or numbers, and forbids mentioning that the text
  was AI generated
- The prompt also forbids asking questions, requesting more information, saying it is waiting, or
  mentioning limits/instructions/placeholders — the returned text is posted verbatim, so it has to
  be usable as-is
- Your own draft is included as context, but cleaned with the same rules
- The exact prompt and the raw model reply are logged (`[API] Prompt sent to …` /
  `[API] Reply received:`) in the extension's service worker console
- Use **Regenerate** in the modal for a different take without re-clicking the button

### Where the Button Appears

An inline button is injected for feed comments, newsletter/article comment areas, messaging,
connection-request notes, Catch-up greetings and the post composer. On top of that, focusing
**any** text box shows the floating ✨ button — except when that box already has an inline button,
so you never get two buttons stacked on the same field.

### Verifying a Build Without a Browser

```bash
npm run smoke
npm run test:prompt
```

Runs `dist/contentScript.js` in a simulated LinkedIn feed post and checks boot, button injection,
reply generation, the modal, and Insert actually writing text into the editor.

`test:prompt` runs the real prompt builder and checks context clean-up (markdown mentions,
zero-width characters, "see more" tails, scraped UI strings), the grounding rules, and that
announcement posts ("starting a new position at ...") get a congratulation instruction instead of
a generic "add an insight" one.

---

## Migration Guide

### From the Gemini-Only Build (1.0.x)

Early builds stored one `apiKey` for Gemini. The current build stores credentials per provider and
migrates the old key on first read — no action is required.

```json
// Before (1.0.x)
{
  "provider": "gemini",
  "apiKey": "AIza...",
  "tone": "professional",
  "maxLength": 500
}

// After (1.1.0, written on the next save)
{
  "provider": "gemini",
  "providers": {
    "gemini": {
      "apiKey": "AIza...",
      "model": "gemini-2.5-flash",
      "baseUrl": "https://generativelanguage.googleapis.com/v1beta"
    }
  },
  "apiKey": "AIza...",
  "tone": "professional",
  "maxLength": 500
}
```

The legacy field is kept so a downgrade still finds a working key. Every other provider starts
empty and is filled in when you first select it.

| Gemini-only behaviour | Current behaviour |
| --- | --- |
| One key, one provider | Eight hosted providers plus a custom OpenAI-compatible endpoint |
| Gemini `generateContent` only | Gemini, Anthropic Messages and OpenAI-compatible request builders |
| Provider is implicit | Provider, model and base URL are explicit and per provider |
| No custom endpoint | Custom base URL with a runtime host-permission prompt |
| One model name | Free-text model with provider-specific suggestions |

### From Manual Copy/Paste

| Manual approach | This extension |
| --- | --- |
| Write a reply in another tab and paste it | Inline button and modal on the composer itself |
| Retry a prompt with different wording | **Regenerate** with the same context |
| Trim a long reply by hand | `maxLength` and the 300-character invite cap |
| Copy the post text yourself | Context chain scrapes the post, selection or nearby block |
| Remember which model/key you used | Popup shows the provider and model; keys are per provider |
| Keep a mental tally of requests | Usage counter, daily limit and reset time |

### From Another Reply Tool

| Another tool's concept | Here |
| --- | --- |
| Cloud account and stored prompts | No account; settings stay in Chrome storage |
| Provider locked by the vendor | Bring your own key and model |
| Browser automation that submits | Review modal; you post |
| Analytics dashboard | Local usage counter only |
| Broad host permissions | LinkedIn + declared provider hosts, optional per-custom-origin grant |

---

## API & Internals

This is a Chrome extension, not an npm library, so there is no public JavaScript API to import
into a web page. The interfaces below are the internal contracts between its own contexts — useful
when extending or debugging it.

### Message Contract

| Direction | Type | Payload | Purpose |
| --- | --- | --- | --- |
| Content → service worker | `GENERATE_REPLY` | `{ postText, authorName?, surface?, mode?, recipientName?, draft? }` | Request a reply for a composer |
| Content → service worker | `GET_SETTINGS` | `{}` | Load settings on boot |
| Service worker → content | `GenerateReplyResponse` | `{ success, reply?, error?, usageCount?, rateLimitReached? }` | Result of a generation |
| Service worker → content | `SETTINGS_RESPONSE` | `{ settings }` | Current normalized settings |
| Service worker → content | `TRIGGER_REPLY` | `{}` | Forward the keyboard shortcut to the tab |
| Chrome command | `generate-ai-reply` | `Alt+Shift+G` (default) | Registered in `manifest.json` |

The content script retries a `GENERATE_REPLY` send when the service worker is asleep, which is
why an idle extension still works on the first click after a restart.

### Generation Inputs

| Field | Type | Meaning |
| --- | --- | --- |
| `postText` | string | Cleaned context to answer (required, 5–10,000 characters) |
| `surface` | `comment` \| `message` \| `invite` \| `greeting` \| `post` \| `generic` | Selects the surface instruction and budget |
| `mode` | `reply` \| `compose` | Reply to existing text or write something new |
| `authorName` | string? | Post author, included when known |
| `recipientName` | string? | Message recipient, truncated to 120 characters |
| `draft` | string? | Your own draft, cleaned and passed as context |

`charLimit` is derived from the surface and `settings.maxLength`, then passed to the prompt
builder. Invite notes are clamped to 300 characters.

### Generation Outputs

| Output | Shape | Where |
| --- | --- | --- |
| Reply text | `string` | Modal |
| Usage count | `number` | Modal and popup |
| Rate-limit flag | `boolean` | Error response and toast |
| Prompt + raw reply | Console text | Service worker console |
| Usage record | `{ count, resetDate, limit }` | `chrome.storage.local` |
| Settings record | `UserSettings` | `chrome.storage.sync` |

### Modules

| Module | Key exports | Responsibility |
| --- | --- | --- |
| `utils/providers.ts` | `LLM_PROVIDERS`, `getProvider()`, `joinUrl()` | Provider registry and URL joining |
| `utils/api.ts` | `buildPrompt()`, `callLLM()`, `resolveProviderConfig()`, `fetchWithRetry()`, `sanitizePostText()` | Prompt construction, provider calls, retries and friendly errors |
| `utils/composers.ts` | `findComposers()`, `classifySurface()`, `getComposerContext()`, `getSurfaceLimit()`, `insertTextIntoComposer()`, `findCommentContainers()`, `findCommentTriggers()`, `openCommentEditor()` | Finds, classifies and reads every composer |
| `utils/dom.ts` | `SELECTORS`, `extractPostData()`, `findPostText()` | LinkedIn selectors and post extraction |
| `utils/text.ts` | `cleanupText()`, `truncate()`, `looksLikeNews()`, `looksLikeContent()` | Scraped-text cleanup and heuristic detection |
| `utils/typing.ts` | `insertIntoContentEditable()`, `insertTextIntoFormControl()`, `verifyInsertion()`, `simulateTyping()`, `fastInsert()` | Native-first insertion with a verified fallback |
| `utils/storage.ts` | `getSettings()`, `saveSettings()`, `getUsage()`, `saveUsage()`, `resetUsageIfExpired()`, `normalizeSettings()`, `clearAllData()` | Chrome storage, defaults and migration |
| `utils/rateLimit.ts` | `trackUsage()`, `checkRateLimit()`, `resetUsage()`, `getRemainingUsage()`, `getTimeUntilReset()` | Daily counter and reset window |
| `utils/validation.ts` | `validateSettings()`, `validateApiKey()`, `validatePostText()`, `escapeHtml()`, `sanitizeText()` | Input validation and sanitization |
| `components/Button.ts` | `createButton()`, `createFloatingButton()`, `setButtonLoading()`, `setButtonError()`, `setButtonSuccess()` | Button rendering and states |
| `components/ReplyModal.ts` | `ReplyModal` | Review, edit, insert, copy, regenerate |

### Prompt Anatomy

A request is assembled in this order:

1. **Tone** — one of the four tone instructions
2. **Surface instruction** — comment, message, invite, greeting, post or generic, with the budget
3. **Output rules** — plain text only, no preamble, no invented facts, no AI disclosure, no
   questions, no placeholders
4. **Participants** — author and/or recipient when available
5. **Delimited context** — the exact text being answered, inside triple quotes
6. **Draft** — your partially typed text, when present
7. **Grounding clause** — the reply must reference something concrete from the context

The system prompt is fixed: write short, natural LinkedIn text; follow instructions exactly; stay
grounded; return only the finished text.

### Provider Request Shapes

| Provider kind | Endpoint | Auth |
| --- | --- | --- |
| `gemini` | `POST {baseUrl}/models/{model}:generateContent?key=…` | Query parameter |
| `anthropic` | `POST {baseUrl}/messages` | `x-api-key` + `anthropic-version` + browser-access header |
| `openai` | `POST {baseUrl}/chat/completions` | `Authorization: Bearer …` when a key is present |

All three send a `temperature` and a computed output-token budget; the OpenAI-compatible caller
also sets `stream: false`.

Model discovery uses `GET {baseUrl}/models` for all three shapes (`/v1/models` on Ollama and other
OpenAI-compatible servers), or a provider's `modelListUrl` when set. Gemini keys go in the query
string, Anthropic keys in `x-api-key`, and OpenAI-compatible keys in the Bearer header. IDs are
de-duplicated, sorted, stripped of Gemini's `models/` prefix and filtered for non-chat models.

### Methods

| Function | Module | Returns | Description |
| --- | --- | --- | --- |
| `getSettings()` | storage | `Promise<UserSettings>` | Read and normalize settings |
| `saveSettings(settings)` | storage | `Promise<void>` | Validate, then persist |
| `getUsage()` | storage | `Promise<UsageData>` | Read the daily counter |
| `trackUsage()` | rateLimit | `Promise<UsageData>` | Increment or throw at the limit |
| `resetUsage()` | rateLimit | `Promise<UsageData>` | Reset the counter manually |
| `checkRateLimit()` | rateLimit | `Promise<LimitStatus>` | Status, count, limit and reset text |
| `buildPrompt(text, settings, meta)` | api | `string` | Build the exact prompt |
| `callLLM(text, settings, meta)` | api | `Promise<string>` | Call the configured provider |
| `fetchProviderModels(providerId, config)` | api | `Promise<string[]>` | List the provider's chat models |
| `fetchWithRetry(url, init, maxRetries?)` | api | `Promise<Response>` | Retry network/5xx, fail fast on 4xx |
| `getComposerContext(composer)` | composers | `ComposerContext` | Draft, selection, nearby text and metadata |
| `insertTextIntoComposer(...)` | composers | `Promise<boolean>` | Insert and verify into the live editor |
| `verifyInsertion(element, text)` | typing | `boolean` | Confirm the text is present |
| `validateSettings(settings)` | validation | `void` | Throw on invalid settings |

---

## Best Practices

### 1. Configure One Provider Properly

```text
Full Settings → AI Provider → key → Test Connection → model → Save
```

Test first, then save. A passing **Test Connection** proves the key, model and host permission in
one step, before a real comment depends on them.

### 2. Start With a Short, Specific Budget

`maxLength: 500` is a good general default. For comments, 250–400 usually reads better; for post
drafts, raise it. The connection-note surface ignores anything above 300 by design.

### 3. Keep Context Narrow

The extension already prefers your draft, then your selection, then the nearest prose block. When
a reply looks generic, select the exact paragraph you want answered and press `Alt+G`. Do not
expect a reply grounded in the entire feed — that is deliberately not how the context chain works.

### 4. Review Before Inserting

Use the modal. Regenerate once or twice if the first take is bland, edit a sentence, then insert.
The extension never posts, but a careless click can still insert text you did not read.

### 5. Turn Off Stealth Mode When Speed Matters

Stealth mode simulates typing, which looks natural but adds delay. If you insert and then edit
anyway, turn it off for an instant write.

### 6. Respect the Daily Limit

The counter is there to stop a runaway loop from burning provider credits. Keep the default of 50
unless you have a reason to raise it, and check the popup before a long session.

### 7. Reload the Extension, Then the Tab

A build only reaches `dist/`. Chrome only loads it after the extension card is reloaded, and
existing tabs only get the new content script after a hard refresh. Doing one without the other is
the most common "my change did nothing" report.

### 8. Prefer the Provider You Can Audit

The prompt and raw reply are logged in the service worker console. If reply quality matters, read
the log once per provider/model combination — it is the fastest way to see whether the context was
thin or the model ignored it.

---

## Performance Optimization

### Optimization Tips

#### 1. Keep the Content Script Self-Contained

```ts
// Any shared helper used by the content script must be statically imported.
import { getComposerContext } from './utils/composers.js'
```

No dynamic imports, no shared chunks, no web-accessible module fetches. This is enforced by the
second build pass (`format: 'iife'`, `inlineDynamicImports: true`) and by the smoke test.

#### 2. Bound the Context Before It Reaches the Model

The context chain caps its input (draft 800 characters, selection 2,000, nearby text 2,500) and
never falls back to the whole feed unless a caller explicitly asks. Smaller context means lower
latency, lower token cost and better replies.

#### 3. Debounce DOM Work

The mutation observer coalesces bursts into a 300 ms scan. Buttons are checked against their
container and nearest ancestors before injection, so a feed that loads 50 posts does not produce
50 duplicate buttons.

#### 4. Cache Settings in the Content Script

Settings are loaded once at boot and refreshed from `chrome.storage.onChanged`. Generating and
inserting do not wait on a storage round-trip.

#### 5. Insert Fast, Verify Always

`insertIntoContentEditable()` tries the native `insertText` command first, scales its word delays
to a 4-second budget, then falls back to a DOM write and verifies the result. It returns `false`
instead of pretending success, which keeps the UI honest.

#### 6. Choose a Model That Fits the Task

Short comments do not need the largest model. A small, fast model with a good prompt usually beats
a slow flagship model for a two-sentence reply; keep the flagship for drafts and complex threads.
Reasoning models get extra output headroom automatically, but they still cost more and take
longer.

#### 7. Turn Off What You Do Not Use

- `floatingButton: false` removes the focus-following button
- `stealthMode: false` removes typing delays
- a lower `rateLimit` caps spend
- console logging stays on by design for diagnostics; it performs no work when no request is made

#### 8. Avoid Duplicate Injection

Two copies of the content script (old tab + reloaded extension) both inject. Hard-refresh after a
reload, and keep one unpacked build loaded at a time.

---

## FAQ

<details>
<summary><strong>What exactly does this extension do?</strong></summary>

It adds an AI writing button to LinkedIn composers. It reads the text around the composer, builds
a surface-specific prompt, sends it to the AI provider you configured with your own key, and shows
the result in a modal where you can edit, regenerate, copy or insert it. It never submits content
for you.

</details>

<details>
<summary><strong>Does it send data anywhere or need an account?</strong></summary>

**No account and no extension backend.** The only outbound request is the provider call made by
your browser. Post or message text is sent to that provider under that provider's terms. Settings
and usage counters stay in Chrome storage. There is no telemetry.

</details>

<details>
<summary><strong>Which providers are supported?</strong></summary>

Google Gemini, OpenAI, Anthropic Claude, DeepSeek, Groq, Mistral, OpenRouter, xAI Grok and any
OpenAI-compatible endpoint, including a local server. Each provider keeps its own key and model.
See [AI Providers](#ai-providers).

</details>

<details>
<summary><strong>Do I need a paid API key?</strong></summary>

Not necessarily. Several providers offer free tiers or trial credit, and a local model through a
custom endpoint needs no paid key at all. Availability and limits are set by the provider, not by
this extension.

</details>

<details>
<summary><strong>Is it free for commercial use?</strong></summary>

**Yes.** The extension is MIT licensed. You may use, modify and distribute it, provided the
copyright and license notice are retained. See the [License](#license) section.

</details>

<details>
<summary><strong>Why does Insert fail while Copy still works?</strong></summary>

That was the classic symptom of a content script that had been code-split: a content script cannot
fetch a separate chunk at runtime. The build now emits one self-contained
`dist/contentScript.js`, and the smoke test asserts that Insert writes into the editor. If you see
it again, rebuild, reload the extension and hard-refresh the tab.

</details>

<details>
<summary><strong>Why is there no button on the page?</strong></summary>

The content script is probably not running in that tab. Rebuild, reload the extension card, then
hard-refresh LinkedIn. Check for `[Content Script] LinkedIn AI Reply Assistant loaded` in the page
console. If it is present, the `Scan:` log line explains which editables were skipped.

</details>

<details>
<summary><strong>Why is the reply generic or off-topic?</strong></summary>

Usually the context was thin. Select the exact post or paragraph and press `Alt+G`. The extension
never uses the whole feed as context because that produces vague replies. It also filters
LinkedIn's UI strings and its own button labels out of the context so the model does not answer
the placeholder instead of the post.

</details>

<details>
<summary><strong>Does it work on newsletters, InMail and Catch-up cards?</strong></summary>

Yes. Article/newsletter comment areas, messaging and InMail, connection notes, Catch-up greetings
and the post composer each have their own surface instruction. See
[Where It Works](#where-it-works).

</details>

<details>
<summary><strong>Why is my connection note cut short?</strong></summary>

LinkedIn caps connection-request notes at 300 characters. The extension clamps that surface to
`min(maxLength, 300)` so the generated note can actually be sent.

</details>

<details>
<summary><strong>Can I use a local or self-hosted model?</strong></summary>

Yes. Choose **Ollama (local)** (or **LM Studio**, **vLLM**, or **Custom**), leave the key empty, and
click **Fetch models** to list what is installed. Ollama's default base URL is
`http://localhost:11434/v1` — run `ollama serve` and `ollama pull llama3.2` first. Loopback HTTP
hosts are declared in the manifest, so reload the unpacked extension in `chrome://extensions/`
after rebuilding. Ollama itself must also allow the extension origin: set
`OLLAMA_ORIGINS=chrome-extension://*` and restart Ollama, otherwise it rejects the request with
403 "origin not allowed". Change the Base URL field if your server is on a different host or port.

</details>

<details>
<summary><strong>Does it work in Edge, Brave or Firefox?</strong></summary>

It is built and tested as a Chrome Manifest V3 extension. Chromium-based browsers that support MV3
can usually load the same unpacked build, but they are not tested. Firefox uses a different
extension model and is not supported.

</details>

<details>
<summary><strong>Does the extension post automatically?</strong></summary>

**No.** There is no code path that clicks Post, Send, Comment or Connect. Insert only writes text
into the editor; you still review and submit it.

</details>

<details>
<summary><strong>Why are the prompt and reply logged?</strong></summary>

So a bad reply can be traced to the exact context the model was given. The logs stay in the local
service worker console and are never uploaded. Clear that console before sharing browser
diagnostics publicly.

</details>

<details>
<summary><strong>Does Test Connection use my daily quota?</strong></summary>

It does not increment the extension's usage counter, but it **is** a real provider request, so it
may consume provider quota or free-tier credit. That is intentional: it verifies the key and the
model, not just the network path.

</details>

<details>
<summary><strong>How do I reset usage or remove all data?</strong></summary>

Use **Reset Usage Counter** on the options page for the daily counter. To remove everything,
delete the extension from `chrome://extensions/`; Chrome removes its storage with it. From an
extension context, `clearAllData()` clears both sync settings and local usage.

</details>

<details>
<summary><strong>Can I change the prompts?</strong></summary>

Only in source. The prompt builder lives in `src/utils/api.ts`; edit it, run `npm run build`, then
run `npm run test:prompt` to catch context or grounding regressions. There is no in-extension
prompt editor.

</details>

<details>
<summary><strong>Is this affiliated with LinkedIn or any AI provider?</strong></summary>

**No.** It is an independent open-source project. LinkedIn, Gemini, OpenAI, Anthropic and the
other provider names are trademarks of their respective owners.

</details>

---

## Changelog

Release history and downloadable builds live on the
[GitHub releases page](https://github.com/malikrajat/ai-assistant-reply/releases).

### 1.1.0 — Multi-provider release

- Eight hosted AI providers plus any custom OpenAI-compatible endpoint
- Per-provider key, model and base URL storage, with automatic migration of the legacy Gemini key
- Support for comments, newsletter comments, messages/InMail, connection notes, Catch-up
  greetings, post drafts and generic text boxes
- Surface-aware prompts, announcement detection and stricter grounding rules
- Scraped-text clean-up for mentions, URLs, zero-width characters, "see more" tails and UI noise
- Floating quick button, `Alt+Shift+G` shortcut and an `Alt+G` fallback
- Verified insertion with a native-first path and a DOM fallback
- Two-pass Vite build, build verification, DOM smoke test and prompt tests
- Provider-aware errors and retry/backoff for network failures

### 1.0.0 — Initial release

- Gemini-powered replies for LinkedIn comments
- Inline button, review modal, tone presets and character limit
- Daily usage counter and local settings

---

### Latest Release

Check the [releases page](https://github.com/malikrajat/ai-assistant-reply/releases) for the most
recent version and changes.

---

## License

This project is licensed under the MIT License.

**TL;DR:** You can use this extension freely in commercial and personal projects.

### MIT License Summary

**You can:**

- Use commercially
- Modify the code
- Distribute
- Use privately

**You must:**

- Include the license and copyright notice

**You cannot:**

- Hold the author liable

---

## Statistics

[![Version](https://img.shields.io/badge/version-1.1.0-blue?logo=googlechrome)](https://github.com/malikrajat/ai-assistant-reply/releases)
[![GitHub issues](https://img.shields.io/github/issues/malikrajat/ai-assistant-reply.svg)](https://github.com/malikrajat/ai-assistant-reply/issues)
[![GitHub stars](https://img.shields.io/github/stars/malikrajat/ai-assistant-reply.svg?style=social)](https://github.com/malikrajat/ai-assistant-reply/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/malikrajat/ai-assistant-reply)

---

## Support This Project

If **LinkedIn AI Reply Assistant** has saved you time and made LinkedIn writing easier,
**please consider giving it a star!**

**Why star this repo?**

- Help other developers discover this lightweight, privacy-first solution
- Support continued development and improvements
- Show appreciation for free, quality tools
- Boost visibility in the JavaScript community
- Supports ongoing development and maintenance
- Encourages more open-source contributions
- Helps other developers find quality tools

### **Want More Quality Libraries?**

This is just one of several useful libraries I've created. **[Explore my other JavaScript & web development libraries](https://github.com/malikrajat?tab=repositories)** that might solve your next challenge:

- **Utility libraries** for common development tasks
- **UI components** for better user experiences
- **Performance tools** for optimization
- **Mobile-friendly solutions** for responsive apps

**Found them helpful?** A star on each repo you find useful helps tremendously! It takes just one click but means the world to open-source maintainers.

[![GitHub](https://img.shields.io/badge/View_All_Repositories-181717?logo=github)](https://github.com/malikrajat?tab=repositories)
[![GitHub followers](https://img.shields.io/github/followers/malikrajat?style=social)](https://github.com/malikrajat)
[![GitHub stars](https://img.shields.io/github/stars/malikrajat/ai-assistant-reply?style=social)](https://github.com/malikrajat/ai-assistant-reply/stargazers)

---

## Support and Community

### Getting Help

Need assistance? Here is where to look first.

| Support Channel | Link | Best For |
| --- | --- | --- |
| Bug Reports | [Report Bug](https://github.com/malikrajat/ai-assistant-reply/issues/new) | Technical issues |
| Feature Requests | [Request Feature](https://github.com/malikrajat/ai-assistant-reply/issues/new) | New features |
| Releases | [Release Notes](https://github.com/malikrajat/ai-assistant-reply/releases) | Version history |
| Email | [mr.rajatmalik@gmail.com](mailto:mr.rajatmalik@gmail.com?subject=LinkedIn%20AI%20Reply%20Assistant%20Support) | Direct support |

### Documentation

- [README: Quick Start](#quick-start)
- [README: Usage](#usage)
- [README: Settings](#settings-reference)
- [README: Troubleshooting](#troubleshooting)
- [GitHub Actions Guide](./GITHUB_ACTIONS.md)
- [GitHub Repository](https://github.com/malikrajat/ai-assistant-reply)
- [Changelog / Releases](https://github.com/malikrajat/ai-assistant-reply/releases)

### Community

- Star the repository to show support
- Watch for updates and new releases
- Share your use cases and feedback
- Contribute code, examples or documentation

### Stay Updated

- Follow the project on [GitHub](https://github.com/malikrajat/ai-assistant-reply)
- Star the repository for updates
- Watch for new releases

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Before opening a PR, run `npm run build` so the type-check, both bundle passes, the build
verifier, the smoke test and the prompt tests all pass. If you changed a prompt, include the
before/after reply you observed and the provider/model that produced it.

---

## Acknowledgements

This extension was built to make LinkedIn writing faster without adding a vendor, an account or a
network hop the user did not choose.

Special thanks to:

- **The JavaScript and Chrome extension communities** — for the standards, tooling and feedback
  that shaped this build
- **Vite, TypeScript and the provider teams** — for the tools and APIs this project is built on
- **Contributors** — for making the extension better with every issue and pull request
- **Everyone who reviews before posting** — for keeping a writing assistant a writing assistant

---

## Other Projects

### Chrome Extensions

| Library | Description | Link |
| --- | --- | --- |
| **ai-assistant-reply** | AI Chrome extension that writes LinkedIn comments, messages, connection notes and post drafts with the provider you choose | [![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/malikrajat/ai-assistant-reply/releases) |
| **quickocr** | Chrome extension that extracts text from images using OCR technology | [![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/malikrajat/quickocr/releases) |
| **readLoude** | Chrome extension that reads web pages aloud, such as articles | [![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/malikrajat/readLoude/releases) |

---

### Monitoring & Diagnostics

| Library | Description | Link |
| --- | --- | --- |
| **@codewithrajat/rm-logvault** | Offline-first browser error tracking, logging and one-file diagnostics export. Redacts PII before writing, stores in IndexedDB, uploads only to your own endpoint. **Zero dependencies, tree-shakeable, framework-agnostic** — React, Vue, Angular, axios and TanStack Query adapters included. | [![npm](https://img.shields.io/npm/v/@codewithrajat/rm-logvault.svg)](https://www.npmjs.com/package/@codewithrajat/rm-logvault) |
| **@codewithrajat/tracepulse** | Zero-dependency API request monitoring, timing and performance observability. Instruments `fetch()` and XHR automatically, measures queue, time-to-response, response-body and UI-render phases, classifies warning/critical thresholds and prints colour-coded console reports or self-contained HTML/JSON exports — no backend, agent or account. | [![npm](https://img.shields.io/badge/npm-1.0.0-blue?logo=npm)](https://www.npmjs.com/package/@codewithrajat/tracepulse) |

---

### UI Components

| Library | Description | npm Link |
| --- | --- | --- |
| **rm-range-slider** | Lightweight two-thumb range slider with tooltips and color customization | [![npm](https://img.shields.io/npm/v/rm-range-slider.svg)](https://www.npmjs.com/package/rm-range-slider) |
| **rm-ng-range-slider** | Angular-specific version of the dual range slider | [![npm](https://img.shields.io/npm/v/rm-ng-range-slider.svg)](https://www.npmjs.com/package/rm-ng-range-slider) |
| **rm-carousel** | Simple, responsive carousel component | [![npm](https://img.shields.io/npm/v/rm-carousel.svg)](https://www.npmjs.com/package/rm-carousel) |
| **rm-image-slider** | Minimal image slider with smooth transitions | [![npm](https://img.shields.io/npm/v/rm-image-slider.svg)](https://www.npmjs.com/package/rm-image-slider) |
| **rm-ng-star-rating** | Configurable Angular star rating component with readonly mode | [![npm](https://img.shields.io/npm/v/rm-ng-star-rating.svg)](https://www.npmjs.com/package/rm-ng-star-rating) |
| **@codewithrajat/rm-ng-typeahead** | Angular autocomplete/typeahead component with search suggestions and keyboard navigation | [![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/malikrajat/rm-ng-typeahead) |
| **@codewithrajat/rm-ng-editor** | Rich text editor component for Angular applications with customizable toolbar support | [![npm](https://img.shields.io/npm/v/@codewithrajat/rm-ng-editor.svg)](https://www.npmjs.com/package/@codewithrajat/rm-ng-editor) |

---

### PDF & Export Libraries

| Library | Description | npm Link |
| --- | --- | --- |
| **rm-ng-export-to-csv** | Export JSON data to CSV with zero dependencies | [![npm](https://img.shields.io/npm/v/rm-ng-export-to-csv.svg)](https://www.npmjs.com/package/rm-ng-export-to-csv) |
| **@codewithrajat/rm-ng-pdf-export** | Image-based PDF export tool for Angular applications | [![npm](https://img.shields.io/npm/v/@codewithrajat/rm-ng-pdf-export.svg)](https://www.npmjs.com/package/@codewithrajat/rm-ng-pdf-export) |
| **@codewithrajat/rm-ng-structure-pdf** | Generate structured PDFs for reports, invoices, or documents | [![npm](https://img.shields.io/npm/v/@codewithrajat/rm-ng-structure-pdf.svg)](https://www.npmjs.com/package/@codewithrajat/rm-ng-structure-pdf) |
| **@codewithrajat/rm-ng-pdf-viewer** | Angular PDF viewer component with zoom, navigation, and document rendering support | [![npm](https://img.shields.io/npm/v/@codewithrajat/rm-ng-pdf-viewer.svg)](https://www.npmjs.com/package/@codewithrajat/rm-ng-pdf-viewer) |

---

### VS Code Extensions

| Library | Description | Link |
| --- | --- | --- |
| **dead-css-cleaner** | VS Code extension for identifying and cleaning unused CSS styles | [![Install](https://img.shields.io/badge/Install-VS_Code-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=RajatMalik.dead-css-cleaner) [![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/malikrajat/dead-css-cleaner/releases) |
| **file-coverage-insight** | VS Code extension for automatically generated component file coverage on open | [![Install](https://img.shields.io/badge/Install-VS_Code-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=RajatMalik.file-coverage-insight) [![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/malikrajat/file-coverage-insight/releases) |
| **npmDepScript** | Run npm scripts and review outdated, deprecated and vulnerable dependencies without leaving VS Code | [![Install](https://img.shields.io/badge/Install-VS_Code-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=RajatMalik.npm-dep-script) [![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/malikrajat/npmDepScript) |

---

### Desktop Applications — All Platforms

| Library | Description | Link |
| --- | --- | --- |
| **deepwork** | Cross-platform productivity application for focus sessions and deep work tracking | [![Website](https://img.shields.io/badge/Website-deepwork.rajatmalik.dev-blue?logo=googlechrome&logoColor=white)](https://deepwork.rajatmalik.dev/) [![Web App](https://img.shields.io/badge/Web_App-app.deepwork.rajatmalik.dev-success?logo=googlechrome&logoColor=white)](https://app.deepwork.rajatmalik.dev/) [![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/malikrajat/deepwork/releases) |
| **JsSandbox** | Cross-platform JavaScript playground and code execution environment | [![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/malikrajat/JsSandbox/releases) |

---

### Device Detection

| Library | Description | npm Link |
| --- | --- | --- |
| **rm-ng-device-detection** | Detect device type, OS, and browser in Angular | [![npm](https://img.shields.io/npm/v/rm-ng-device-detection.svg)](https://www.npmjs.com/package/rm-ng-device-detection) |

---

### Notifications

| Library | Description | npm Link |
| --- | --- | --- |
| **rm-pushnotify** | Lightweight push-style toast notification utility | [![npm](https://img.shields.io/npm/v/rm-pushnotify.svg)](https://www.npmjs.com/package/rm-pushnotify) |
| **@codewithrajat/rm-toast-notification** | Cross-platform toast and desktop notification library for web, Angular, and desktop applications | [![npm](https://img.shields.io/npm/v/@codewithrajat/rm-toast-notification.svg)](https://www.npmjs.com/package/@codewithrajat/rm-toast-notification) |

---

### Layout & Dynamic Rendering

| Library | Description | Link |
| --- | --- | --- |
| **rm-ng-dynamic-layout** | Dynamic layout rendering engine for Angular applications using JSON-driven UI configuration | [![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/malikrajat/rm-ng-dynamic-layout) |

---

### Developer Tools & Extensions

| Library | Description | npm Link |
| --- | --- | --- |
| **rm-colorful-console-logger** | Structured and colorized console logging utility for developers | [![npm](https://img.shields.io/npm/v/rm-colorful-console-logger.svg)](https://www.npmjs.com/package/rm-colorful-console-logger) |

---

### Meta & Personal Branding

| Library | Description | npm Link |
| --- | --- | --- |
| **about-rajat** | Developer portfolio package for branding and quick personal info | [![npm](https://img.shields.io/npm/v/about-rajat.svg)](https://www.npmjs.com/package/about-rajat) |

---

### All Packages

Browse all my packages:

- [npm: @codewithrajat](https://www.npmjs.com/~codewithrajat)
- [npm: rajatmalik](https://www.npmjs.com/~rajatmalik)
- [GitHub: @malikrajat](https://github.com/malikrajat?tab=repositories)

---

## Author

**Rajat Malik**

Full-Stack Developer and Frontend Architect at Siemens with 14+ years building scalable enterprise platforms, specializing in micro-frontends, AI-native development, React, and Angular.
Author of 10+ open-source libraries and 100+ technical articles, driving innovation through developer-friendly tools, performance optimization, and AI-assisted workflows.

### GET IN TOUCH

- Portfolio:  [rajatmalik.dev](https://rajatmalik.dev)
- Email:      [mr.rajatmalik@gmail.com](mailto:mr.rajatmalik@gmail.com)
- LinkedIn:   [errajatmalik](https://linkedin.com/in/errajatmalik)
- GitHub:     [@malikrajat](https://github.com/malikrajat)
- npm:        [rajatmalik](https://www.npmjs.com/~rajatmalik)

### SOCIAL PRESENCE

- Threads:    [rajatmalik](https://www.threads.net/@er.rajatmalik)
- Twitter/X:  [rajatmalik](https://x.com/er_rajatmalik)
- BlueSky:    [rajatmalik](http://devrajat.bsky.social)

### CONTENT & WRITING

- Medium:    [rajatmalik](https://medium.com/@codewithrajat)
- Dev.to:    [rajatmalik](https://dev.to/codewithrajat)
- Substack:  [rajatmalik](https://codewithrajat.substack.com)
- Hashnode:  [rajatmalik](https://hashnode.com/@codeswithrajat)

---

<p align="center">
  Made with care and love by <a href="https://rajatmalik.dev">Rajat Malik</a> for the JavaScript community
</p>

<p align="center">
  <a href="https://github.com/malikrajat/ai-assistant-reply/stargazers">Star on GitHub</a> •
  <a href="https://github.com/malikrajat/ai-assistant-reply/releases">Releases</a> •
  <a href="https://github.com/malikrajat/ai-assistant-reply/issues">Report Issue</a> •
  <a href="#quick-start-guide">Install Guide</a>
</p>

<p align="center">
  Made with dedication by <a href="https://rajatmalik.dev">Rajat Malik</a>
</p>

---

**Note**: This extension is not affiliated with or endorsed by LinkedIn, Google or any AI provider.
