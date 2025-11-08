# Fromptly

> AI-powered prompt refinement tool for Google AI Studio

**Fromptly** is a Chrome Extension that helps Vibe Coders write better prompts for Frontend development in Google AI Studio by providing real-time suggestions.

---

## 🎯 Problem

Vibe Coders with limited frontend knowledge often write vague prompts:
- ❌ "button animation"
- ❌ "text gradient"

These prompts make it difficult for AI to understand specific requirements.

## ✨ Solution

Fromptly provides real-time prompt improvements as you type:

**Before**:
```
button animation
```

**After (Fromptly suggestions)**:
```
🅰️ Add a button hover animation that scales to 1.1 over 0.3 seconds
🅱️ Create a button click animation with ripple effect and smooth background color transition
```

---

## 📦 Installation

### 1. Load Chrome Extension

1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `fromptly` folder
6. ✅ Extension loaded!

---

## 🚀 Usage

### Step 1: Visit Google AI Studio

Navigate to https://aistudio.google.com

### Step 2: Enter a prompt

In the Build tab, type in the "Describe your idea" textarea (minimum 10 characters)

Example:
```
text gradient effect
```

### Step 3: View suggestions

After 1 second, the Suggestion Bar will appear below the textarea:

```
┌─────────────────────────────────────────────┐
│ 🅰️ Apply a left-to-right 2s gradient...    │
├─────────────────────────────────────────────┤
│ 🅱️ Use linear-gradient with rainbow...     │
└─────────────────────────────────────────────┘
```

### Step 4: Apply suggestion

Click on a suggestion to automatically apply it to the textarea.

---

## 🔧 API Key Setup (Optional)

For better suggestions, connect your preferred AI API:

### Option 1: Claude API (Anthropic)

1. Get an API Key from [Anthropic Console](https://console.anthropic.com/)
2. Open `config.js` file
3. Update the configuration:

```javascript
export const config = {
  AI_PROVIDER: 'claude',  // Use Claude
  ANTHROPIC_API_KEY: 'sk-ant-your-api-key-here',
  // ... other settings
};
```

4. Reload the extension

### Option 2: Gemini API (Google)

1. Get an API Key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Open `config.js` file
3. Update the configuration:

```javascript
export const config = {
  AI_PROVIDER: 'gemini',  // Use Gemini
  GEMINI_API_KEY: 'your-gemini-api-key-here',
  // ... other settings
};
```

4. Reload the extension

**Note**: 
- Choose `AI_PROVIDER: 'claude'` or `AI_PROVIDER: 'gemini'` in `config.js`
- Fallback suggestions work without an API key

---

## 🧪 Test Scenarios

### Test Case 1: Before Project Start (Center Textarea)

```
1. Visit https://aistudio.google.com/app/prompts/new
2. Type in center textarea: "button hover effect"
3. Wait 1 second for Suggestion Bar
4. Click 🅰️ or 🅱️
5. Verify suggestion is applied to textarea
```

### Test Case 2: After Coding Started (Left Panel Textarea)

```
1. Enter a prompt and click "Build"
2. Type in left panel textarea: "change color"
3. Verify Suggestion Bar appears on the left
4. Select and apply suggestion
```

### Test Case 3: Rapid Editing

```
1. Type "text"
2. Immediately edit to "text gradient"
3. Verify API is called only once (Debounce)
```

---

## 🏗️ Architecture

```
fromptly/
├── manifest.json       # Extension configuration
├── config.js           # API Keys and AI Provider selection
├── config.example.js   # Configuration template
├── content.js          # Textarea detection and UI manipulation
├── background.js       # LLM API calls (Claude + Gemini)
├── styles.css          # Suggestion Bar styling
├── icon.svg            # Extension icon
└── README.md           # This file
```

### Core Logic

1. **Textarea Detection**: Identifies Google AI Studio textareas using `cdktextareaautosize` attribute and placeholder
2. **Debounce**: Waits 1 second after last input (prevents excessive API calls)
3. **AI Provider Selection**: Chooses between Claude or Gemini API based on config
4. **LLM Integration**: Requests prompt improvements from selected AI provider
5. **Inline Suggestion**: Displays suggestions directly below textarea
6. **Click to Apply**: Automatically applies selected suggestion to textarea

---

## 🐛 Debugging

### Suggestion Bar not appearing

1. **Check Console**:
   - Press F12 → Console tab
   - Look for `[Fromptly]` logs

2. **Check Textarea Detection**:
   - Console should show `[Fromptly] Found X AI textareas`
   - If 0, there's a selector issue

3. **Check API Errors**:
   - Go to Extension → Service Worker Console
   - Look for API call failure logs

### Reload Extension

After code changes:
1. Navigate to `chrome://extensions`
2. Find Fromptly Extension
3. Click refresh button
4. Reload Google AI Studio tab (F5)

---

## 📊 MVP Scope

### ✅ Implemented
- Textarea auto-detection (both states)
- Real-time input detection (1 second debounce)
- LLM API integration (Claude + Gemini 2.5 Flash)
- AI Provider selection (configurable)
- Inline Suggestion Bar
- Click to Apply
- Fallback (default suggestions on API error)

### ❌ Intentionally Excluded (Keep it simple)
- Loading animations
- Error message UI
- Keyboard shortcuts (Tab/Esc)
- Suggestion history
- Dark Mode auto-detection
- Internationalization
- Mobile support

---

## 🤝 Contributing

This project is in MVP stage. Feedback welcome!

---

## 📄 License

MIT License

---

## 👤 Author

Fromptly - AI-powered prompt refinement for Frontend Vibe Coders

**Made with ❤️ for Vibe Coders**
