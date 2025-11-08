// Fromptly - Configuration Template
// Copy this file to config.js and fill in your API keys

export const config = {
  // AI Provider: 'claude' or 'gemini'
  AI_PROVIDER: 'gemini',

  // Gemini API (Get your API key from: https://aistudio.google.com/app/apikey)
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-exp:generateContent',
  // Claude API (Get your API key from: https://console.anthropic.com/)
  ANTHROPIC_API_KEY: 'YOUR_ANTHROPIC_API_KEY_HERE',
  ANTHROPIC_API_URL: 'https://api.anthropic.com/v1/messages',
};
