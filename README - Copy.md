# LinkedIn AI Reply Assistant

> **Note:** This is an older copy of the documentation. See [`README.md`](README.md) for the current provider list (including OpenCode Console/Zen, Ollama local models, model discovery and 20 presets).

A Chrome extension that writes LinkedIn replies and drafts with the AI provider you choose - Gemini, OpenAI, Claude, DeepSeek, Groq, Mistral, OpenRouter, xAI or any OpenAI-compatible endpoint - in comments, messages, connection notes and post drafts.

## Features

- 🤖 **AI-Powered Replies**: Generate professional, polite, friendly, or concise replies to LinkedIn posts
- 🔌 **Bring Your Own Provider**: 9 provider options including DeepSeek, OpenAI, Claude, Groq, Mistral, OpenRouter, xAI and custom OpenAI-compatible endpoints
- 🧭 **Works on Every Composer**: Comments, feed post drafts, LinkedIn messages/InMail, and connection-request notes
- ✨ **One-Click Integration**: Inline AI button injected into each text box, plus a floating quick button on the field you're typing in
- ⌨️ **Keyboard Shortcut**: `Alt+Shift+G` generates for whatever text box has focus (remappable at `chrome://extensions/shortcuts`)
- ♻️ **Regenerate & Review**: Edit, regenerate, copy, or insert the result before it goes anywhere
- 🎨 **Customizable Tones**: Choose from 4 different reply tones to match your style
- 📊 **Usage Tracking**: Monitor your daily API usage with built-in rate limiting
- 🔒 **Privacy-Focused**: All data stored locally, API key never exposed to page context
- ⚡ **Fast & Lightweight**: Word-chunked typing keeps insertion under ~4 seconds on any reply length

## Where It Works

| Surface | What it writes | Context it reads |
| --- | --- | --- |
| Post comments | A comment replying to the post | Post text, author name |
| Newsletter / article comments | A comment on the article | Article + comment area |
| Messages / InMail | The next message in the thread | Last messages in the conversation, recipient name |
| Connection notes | A personalised invite note (LinkedIn's 300 character cap is enforced) | Profile name + headline |
| Catch up (birthday, work anniversary, new job, education) | A short congratulations message | Card/dialog copy |
| Post composer | A post draft | The notes/topic you typed in the box |
| Any other text box | Ready-to-use text | Whatever you typed, else the surrounding block |

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Chrome browser
- Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd linkedin-ai-reply-assistant
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Extension

```bash
npm run build
```

This will create a `dist/` folder with the compiled extension.

### 4. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `dist/` folder from your project directory

### 5. Configure API Key

1. Click the extension icon in Chrome toolbar
2. Click "Full Settings" or right-click the extension icon and select "Options"
3. Enter your Gemini API key
4. Click "Test Connection" to verify
5. Configure your preferred settings (tone, max length, rate limit)
6. Click "Save Settings"

## Usage

### Generating Replies

1. Navigate to any LinkedIn post
2. Look for the purple "✨ AI Reply" button in comment boxes
3. Click the button to generate a reply
4. Review and edit the generated reply in the modal
5. Click "Insert" to add it to the comment box, or "Copy" to copy to clipboard
6. Edit further if needed and post your comment

### Quick Generate Anywhere

- Click into any LinkedIn text box and press `Alt+Shift+G`
- Or click the small floating "✨" button that follows the text box you're typing in
- Use "Regenerate" inside the modal to get a different take without starting over

The same flow works in messaging, connection-request notes, and the post composer - the prompt adapts to the surface (a DM reads like a chat message, an invite note respects the 300 character cap, a post draft gets structure).

### Quick Settings

- Click the extension icon to access quick settings
- Change reply tone on-the-fly
- View today's usage statistics

### Full Settings

Access the full settings page to configure:
- **API Key**: Your Gemini API key
- **AI Provider**: Which model answers - see below
- **Model**: Free-text model name, defaulted per provider
- **Reply Tone**: Professional, Polite, Friendly, or Concise
- **Max Reply Length**: 100-1000 characters
- **Default Action**: Auto-insert or Manual copy
- **Rate Limit**: Daily request limit (default: 50)
- **Floating Quick Button**: Show/hide the quick button on the focused text box

## AI Providers

Pick the provider in **Full Settings → AI Configuration**. Keys are stored per provider, so you can
switch back and forth without re-entering anything.

| Provider | Default model | Where to get a key |
| --- | --- | --- |
| Google Gemini | `gemini-2.5-flash` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| DeepSeek | `deepseek-chat` | [platform.deepseek.com](https://platform.deepseek.com/api_keys) |
| OpenAI | `gpt-4o-mini` | [platform.openai.com](https://platform.openai.com/api-keys) |
| Anthropic Claude | `claude-3-5-sonnet-latest` | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| Groq | `llama-3.3-70b-versatile` | [console.groq.com](https://console.groq.com/keys) |
| Mistral AI | `mistral-small-latest` | [console.mistral.ai](https://console.mistral.ai/api-keys) |
| OpenRouter | `openai/gpt-4o-mini` | [openrouter.ai/keys](https://openrouter.ai/keys) |
| xAI Grok | `grok-2-latest` | [console.x.ai](https://console.x.ai) |
| Custom | your choice | any OpenAI-compatible endpoint (`https://host/v1`) |

Notes:

- Every provider except Gemini, Claude and "Custom" uses the OpenAI-compatible
  `/chat/completions` shape, so the model field accepts any model that provider serves.
- **Test Connection** sends a real sample post ("starting a new position as a Senior
  Software Engineer at Apple") and shows the first part of the reply, so you can sanity
  check both the key and the quality before using it on LinkedIn.
- For a **Custom** endpoint, Chrome asks for permission to reach that host when you save.
- Reasoning models (Gemini 2.5, `deepseek-reasoner`) get a larger token budget automatically.
- Client errors (bad key, unknown model, no credits) fail immediately instead of retrying.

## Development

### Project Structure

```
linkedin-ai-reply-assistant/
├── src/
│   ├── contentScript.ts       # Injects buttons and handles UI
│   ├── serviceWorker.ts       # Background tasks and API calls
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── utils/
│   │   ├── api.ts            # Gemini API integration
│   │   ├── storage.ts        # Chrome storage utilities
│   │   ├── rateLimit.ts      # Usage tracking and rate limiting
│   │   ├── dom.ts            # LinkedIn DOM manipulation
│   │   ├── composers.ts      # Finds every text box + classifies the surface
│   │   ├── typing.ts         # Fast, natural-looking text insertion
│   │   └── validation.ts     # Input validation and sanitization
│   ├── components/
│   │   ├── Button.ts         # AI reply button component
│   │   ├── ReplyModal.ts     # Reply modal component
│   │   └── ReplyModal.css    # Modal styles (documentation)
│   ├── options/
│   │   ├── options.html      # Options page
│   │   ├── options.ts        # Options page logic
│   │   └── options.css       # Options page styles
│   ├── popup/
│   │   ├── popup.html        # Popup page
│   │   ├── popup.ts          # Popup page logic
│   │   └── popup.css         # Popup page styles
│   └── styles.css            # Content script styles
├── public/
│   ├── manifest.json         # Extension manifest
│   └── icons/                # Extension icons
├── dist/                     # Build output (generated)
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

# Production build (two passes: extension pages + self-contained content script)
npm run build

# Rebuild only the content script bundle
npm run build:content

# Type checking
npm run type-check
```

### Why the build has two passes

The content script is bundled on its own into a single self-contained
`dist/contentScript.js`. Content scripts are injected as classic scripts and
cannot fetch extra chunks at runtime, so a code-split (or dynamically imported)
content script fails at runtime - that is what used to make **Insert** fail while
**Copy** still worked.

### Making Changes

1. Make your changes in the `src/` directory
2. Run `npm run build` to compile
3. Reload the extension in Chrome (click reload icon on `chrome://extensions/`)
4. Test your changes on LinkedIn

## Testing

### Manual Testing Checklist

#### Installation & Setup
- [ ] Extension loads without errors
- [ ] Options page is accessible
- [ ] API key can be saved
- [ ] Settings persist across browser restarts

#### Button Injection
- [ ] Buttons appear on feed posts
- [ ] Buttons appear on comment boxes
- [ ] Button appears in the message composer
- [ ] Button appears on the connection-request note box
- [ ] Button appears in the post composer
- [ ] Buttons appear on dynamically loaded content
- [ ] No duplicate buttons
- [ ] Buttons are styled appropriately
- [ ] Floating quick button follows the focused text box
- [ ] Floating quick button hides when the floating button setting is off

#### Quick Generate
- [ ] `Alt+Shift+G` generates for the focused text box
- [ ] Shortcut works in the message composer
- [ ] Regenerate replaces the text in the modal
- [ ] Connection note stays within LinkedIn's 300 character cap

#### Reply Generation
- [ ] Click button triggers API call
- [ ] Loading state is displayed
- [ ] Generated reply appears in modal
- [ ] Different tones produce different results
- [ ] Max length is respected

#### Reply Insertion
- [ ] Insert button populates comment box
- [ ] Copy button copies to clipboard
- [ ] User can edit before inserting
- [ ] Cancel closes modal without action

#### Usage Tracking
- [ ] Usage count increments
- [ ] Rate limit is enforced
- [ ] Counter resets after 24 hours
- [ ] Usage is displayed in popup

#### Error Handling
- [ ] Invalid API key shows error
- [ ] Network errors are handled gracefully
- [ ] Rate limit shows appropriate message
- [ ] Empty post text is handled

### Testing on LinkedIn

1. Navigate to [LinkedIn Feed](https://www.linkedin.com/feed/)
2. Scroll through posts and verify buttons appear
3. Click a button and test reply generation
4. Try different tones and verify results
5. Test copy and insert functionality
6. Verify usage counter updates

## Troubleshooting

### Extension Not Loading

- Ensure you've run `npm run build`
- Check that the `dist/` folder exists and contains files
- Verify Developer mode is enabled in Chrome
- Check the Chrome console for errors

### Buttons Not Appearing

- Refresh the LinkedIn page
- Check that the extension is enabled
- Verify content script is injected (check Chrome DevTools → Sources)
- LinkedIn may have updated their DOM structure (check console for errors)

### API Errors

- Verify your API key is correct
- Check your Gemini API quota at [Google AI Studio](https://makersuite.google.com/)
- Ensure you have internet connectivity
- Check the service worker console for detailed errors

### Insert Does Nothing (Copy Works)

- Rebuild with `npm run build`, then reload the extension on `chrome://extensions/`
- `dist/contentScript.js` must be a single file with no `import` statements - a chunked content script cannot run
- Open the page's DevTools console and look for `[Typing]` warnings; they name the editor that refused the text
- If LinkedIn re-rendered the text box, the extension now re-resolves it and tells you instead of failing silently

### Nothing Happens On LinkedIn (No Button At All)

This means the content script is not running in that tab. Check in this order:

1. `npm run build` - the build now runs a smoke test that fails loudly if the bundle is broken
2. Reload the extension on `chrome://extensions/` (the reload icon on the extension card)
3. **Hard-refresh the LinkedIn tab** (Ctrl+Shift+R). Tabs that were already open keep the old
   content script until you refresh them
4. Open DevTools on the LinkedIn page and confirm you see `[Content Script] LinkedIn AI Reply Assistant loaded`
   plus `[Content Script] Composers: X, comment boxes: Y, comment triggers: Z, buttons added: N`
   and `[Content Script] Scan: editables seen: N, accepted: M, skipped (...)`

If the logs are missing entirely, the script was not injected - re-load the unpacked `dist` folder.
If the logs appear but `buttons added` is 0 on a page with a text box, send both log lines along
with the page you are on - the `Scan:` line says exactly what was skipped and why.

### "Could not read the post text"

The console says which source was used, so this tells you what happened:

```
[Composers] Comment context: 210 chars (source: nearby block (level 2))
[Composers] Comment context: 0 chars (source: none)
```

- `post container` / `nearby block` - the post text was found and sent
- `page selection` - nothing was scraped, so the text you had selected was used
- `none` - nothing readable was found. Select the post text and press `Alt+G`; that always works

Post text is looked up without depending on LinkedIn's class names: the extension first tries the
known post containers, then walks up from the comment box to the nearest prose block that is not
part of a comment thread, a navigation bar or the extension's own UI. Blocks that are only UI
labels ("Like Comment Share Repost Send") are rejected rather than sent as the post.

### Verifying A Build Without A Browser

```bash
npm run smoke
npm run test:prompt
```

Runs `dist/contentScript.js` in a simulated LinkedIn feed post and checks boot, button
injection, reply generation, the modal, and Insert actually writing text into the editor.

`test:prompt` runs the real prompt builder and checks context clean-up (markdown mentions,
zero-width characters, "see more" tails, scraped UI strings), the grounding rules, and that
announcement posts ("starting a new position at ...") get a congratulation instruction
instead of a generic "add an insight" one.

### Reply Quality

- Post text is scraped from LinkedIn's current containers, then stripped of markdown
  mentions, URLs, zero-width characters and "see more" tails before it reaches the model
- The extension's own UI never reaches the model: "AI Reply", "Generating...", "Regenerate"
  and usage counters are filtered out of scraped text, and the context is read *before* the
  button switches to its loading label
- Context is collected as a chain: your draft → text you have selected on the page → the
  nearest ancestor block with real text. Composers are classified from class names *and* their
  aria-label/placeholder/dialog heading, so unknown layouts still get a sensible prompt.
  The whole feed is deliberately never used as context, since that produces off-topic replies.

### Manual Context (works on any surface)

Select the text you want answered (a post, a message, a paragraph in a newsletter) and press
`Alt+Shift+G` or `Alt+G`. The selection is used as the context, so this works even on layouts
the extension does not recognise. The page console logs which source was used:

```
[Composers] Generic composer context - draft: 0, selection: 180, nearby: 0
```
- Announcement posts (new role, promotion, anniversary, graduation) get a grounded
  congratulation instruction that names the role/company instead of generic commentary,
  plus an explicit ban on customer-service wording ("we have received...", "we will let
  you know...") and an example of the intended shape
- The prompt forbids inventing names, companies or numbers, and forbids mentioning
  that the text was AI generated
- The prompt also forbids asking questions, requesting more information, saying it is
  waiting, or mentioning limits/instructions/placeholders - the returned text is posted
  verbatim, so it has to be usable as-is
- Your own draft is included as context, but cleaned with the same rules
- The exact prompt and the raw model reply are logged (`[API] Prompt sent to Gemini` /
  `[API] Reply received`) in the extension's service worker console
- Use **Regenerate** in the modal for a different take without re-clicking the button

### Where The Button Appears

An inline button is injected for feed comments, newsletter/article comment areas,
messaging, connection-request notes, Catch-up greetings and the post composer. On top of
that, focusing **any** text box shows the floating ✨ button - except when that box already
has an inline button, so you never get two buttons stacked on the same field.

### Rate Limit Issues

- Check your current usage in the popup
- Wait for the counter to reset (shown in popup)
- Increase your rate limit in settings if needed
- Manually reset the counter in options page

## Privacy & Security

- **Local Storage**: All settings and usage data stored locally in Chrome
- **API Key Security**: API key stored in `chrome.storage.sync` (encrypted by Chrome)
- **No Tracking**: No analytics or tracking of any kind
- **Minimal Data**: Only post text and basic metadata sent to Gemini API
- **User Control**: User must review and approve all generated content

## Permissions

The extension requests the following permissions:

- `storage`: To save settings and usage data
- `activeTab`: To interact with LinkedIn pages
- `host_permissions` for `https://www.linkedin.com/*`: To inject buttons and read post content

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section above

## Acknowledgments

- Built with [Vite](https://vitejs.dev/)
- Powered by [Google Gemini](https://ai.google.dev/)
- Icons from custom SVG designs

---

**Note**: This extension is not affiliated with or endorsed by LinkedIn or Google.
