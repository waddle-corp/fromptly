# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language Preference

**IMPORTANT:** 항상 한글로 답변해주세요. (Always respond in Korean.)

## Project Overview

**Fromptly** is a Chrome Extension (Manifest V3) that provides real-time AI-powered prompt refinement for Google AI Studio. It helps "Vibe Coders" with limited frontend knowledge write better, more specific prompts by detecting textarea input and displaying inline suggestions powered by Claude API.

## Development Setup

### Initial Configuration

1. **Copy configuration template:**
   ```bash
   cp config.example.js config.js
   ```

2. **Add Anthropic API key:**
   Edit [config.js](config.js) and replace `YOUR_ANTHROPIC_API_KEY_HERE` with your API key from https://console.anthropic.com/

3. **Load extension in Chrome:**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `fromptly` directory

### Testing Workflow

**Always test at:** https://aistudio.google.com/app/prompts/new

**Reload after changes:**
```bash
# In Chrome: chrome://extensions/ → Find Fromptly → Click reload button
# Then refresh the Google AI Studio tab (F5)
```

## Architecture

### Extension Components

The extension follows Chrome Extension Manifest V3 architecture with three isolated JavaScript contexts:

1. **[content.js](content.js)** - Content Script (runs in page context)
   - Detects Google AI Studio textareas via selector: `textarea[cdktextareaautosize]` with specific placeholders
   - Manages input detection with 1-second debounce
   - Handles suggestion bar lifecycle (create, display, remove, apply)
   - Uses WeakMap/WeakSet to track textarea-specific state (listeners, timers, bars)

2. **[background.js](background.js)** - Service Worker (isolated background context)
   - **ES6 Module** (`"type": "module"` in manifest.json)
   - Handles Claude API integration via `chrome.runtime.onMessage`
   - Implements fallback logic when API key is missing or API fails
   - Parses Claude responses (handles both JSON blocks and plain text)

3. **[styles.css](styles.css)** - Injected Styles
   - Provides suggestion bar UI with dark mode support
   - Uses `z-index: 1000` to overlay Google AI Studio UI

### Key Technical Details

**Message Passing Pattern:**
```javascript
// content.js → background.js
chrome.runtime.sendMessage({ type: 'REFINE_PROMPT', prompt: userPrompt })

// background.js responds asynchronously
sendResponse({ suggestions: { suggestionA, suggestionB } })
```

**Textarea Detection Logic:**
The extension must handle two UI states in Google AI Studio:
- **Before project start**: Center textarea with placeholder "Describe your idea"
- **After coding started**: Left panel textarea with placeholder "Make changes"

Uses `MutationObserver` to detect dynamically added textareas.

**Debounce Implementation:**
Each textarea has its own debounce timer stored in a WeakMap to prevent multiple API calls during rapid typing (1000ms delay).

**Angular Integration:**
Google AI Studio uses Angular. After applying suggestions, the extension dispatches both `input` and `change` events to trigger Angular's change detection:
```javascript
textarea.dispatchEvent(new Event('input', { bubbles: true }));
textarea.dispatchEvent(new Event('change', { bubbles: true }));
```

## Important Constraints

### Configuration Management

**CRITICAL:** `config.js` contains the API key and is gitignored. Always use `config.example.js` as the template. Never commit actual API keys.

### Service Worker Module System

[background.js](background.js) uses ES6 modules (`import`/`export`). This requires `"type": "module"` in [manifest.json](manifest.json):
```json
"background": {
  "service_worker": "background.js",
  "type": "module"
}
```

### Fallback Strategy

The extension must work without an API key by providing hardcoded suggestions. This is implemented at two levels:
1. In [background.js](background.js): When API key is missing/invalid
2. In [content.js](content.js): When message passing fails

### MVP Scope

**Intentionally excluded features** (per README):
- Loading animations
- Error message UI
- Keyboard shortcuts (Tab/Esc)
- Suggestion history
- Mobile support

Do not add these features unless explicitly requested.

## Common Issues

### Extension Not Working

1. **Check Service Worker Console:**
   ```
   chrome://extensions/ → Fromptly → "service worker" link → Console
   ```
   Look for `[Fromptly Background]` logs

2. **Check Page Console:**
   ```
   F12 on aistudio.google.com → Console tab
   ```
   Look for `[Fromptly]` logs and textarea detection count

3. **Verify config.js exists:**
   Must be copied from config.example.js

### Suggestion Bar Not Appearing

- Minimum input length: 10 characters
- Check if textarea selector still matches (Google AI Studio may update their DOM)
- Verify 1-second debounce completed

### API Integration Issues

Claude API expects specific format:
- Model: `claude-3-5-sonnet-20241022`
- System instruction with JSON output requirement
- Response parsing handles both markdown JSON blocks (`\`\`\`json`) and raw JSON

## Code Style Notes

- Korean comments are used throughout the codebase
- Console logs prefixed with `[Fromptly]` or `[Fromptly Background]`
- WeakMap/WeakSet preferred over regular Map/Set for memory management of DOM references
