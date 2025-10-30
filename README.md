# LinkedIn AI Reply Assistant

A Chrome extension that provides AI-generated reply suggestions for LinkedIn posts and comments using Google's Gemini LLM.

## Features

- 🤖 **AI-Powered Replies**: Generate professional, polite, friendly, or concise replies to LinkedIn posts
- ✨ **One-Click Integration**: Inject AI reply buttons directly into LinkedIn comment boxes
- 🎨 **Customizable Tones**: Choose from 4 different reply tones to match your style
- 📊 **Usage Tracking**: Monitor your daily API usage with built-in rate limiting
- 🔒 **Privacy-Focused**: All data stored locally, API key never exposed to page context
- ⚡ **Fast & Lightweight**: Minimal performance impact on LinkedIn

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

### Quick Settings

- Click the extension icon to access quick settings
- Change reply tone on-the-fly
- View today's usage statistics

### Full Settings

Access the full settings page to configure:
- **API Key**: Your Gemini API key
- **Reply Tone**: Professional, Polite, Friendly, or Concise
- **Max Reply Length**: 100-1000 characters
- **Default Action**: Auto-insert or Manual copy
- **Rate Limit**: Daily request limit (default: 50)

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

```bash
# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build
npm run build

# Type checking
npm run type-check
```

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
- [ ] Buttons appear on dynamically loaded content
- [ ] No duplicate buttons
- [ ] Buttons are styled appropriately

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
