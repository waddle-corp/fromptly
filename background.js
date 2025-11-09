// Fromptly - Background Service Worker
// Gemini API 연동

import { config } from './config.js';

console.log('[Fromptly Background] Service worker loaded');

// API 설정
const GEMINI_API_KEY = config.GEMINI_API_KEY;
const GEMINI_API_URL = config.GEMINI_API_URL;

/**
 * Gemini API 호출하여 프롬프트 개선 제안 받기
 */
async function refinePromptWithGemini(userPrompt) {
  const systemInstruction = `You are a Frontend expert helping users create code in Google AI Studio.

Transform vague user prompts into clear, actionable prompts optimized for Gemini API while preserving the user's original intent.

IMPORTANT: Provide ONLY ONE suggestion, not multiple options.

Rules:
0. **PRESERVE USER INTENT**: Keep the user's original request intact, only add clarity
   - If user says "button animation", don't specify which button or exact properties unless context demands it
   - If user says "card layout", don't assume grid/flex or column count unless mentioned
   - Add details that CLARIFY the request, not CHANGE it

1. Be specific about BEHAVIOR and PURPOSE, not exact values:
   - Good: "smoothly scale up", "natural transition", "appropriate spacing"
   - Avoid: "scale(1.05)", "#4F46E5", "320px"
   - Exception: When user's original prompt includes specific values, preserve them

2. Each prompt 25-50 words (concise but complete)

3. ALWAYS output in English, regardless of input language

4. DO NOT specify tech stack (no React, Tailwind, Vue, etc.) - let Gemini choose

5. Structure for Gemini optimization:
   - Start with WHAT (the component/feature)
   - Then HOW (interaction/behavior)
   - End with PURPOSE (user experience goal)

6. Include these when relevant:
   - Accessibility hints ("clearly indicate clickability", "support keyboard navigation")
   - Responsive considerations ("work on both mobile and desktop")
   - Visual feedback ("provide visual feedback on interaction")

Examples (note: ONE suggestion only):
Input: "버튼 애니메이션 구현해줘"
Output JSON:
{
  "suggestion": "Add a smooth scale-up animation to the button on hover. Use an appropriate transition speed to make it natural, and clearly convey to users that the element is interactive."
}

Input: "카드 레이아웃을 만들어줘"
Output JSON:
{
  "suggestion": "Create a clean card component layout with appropriate spacing and rounded corners for each card. Add a subtle lift effect on hover to make it feel interactive and ensure it works well on both mobile and desktop."
}

Input: "Create a logo animation moving from left to right with 60px height"
Output JSON:
{
  "suggestion": "Animate the logo image smoothly from left to right while maintaining a fixed height of 60px. Implement it with a natural movement speed and consider adding a subtle fade-in effect."
}

CRITICAL: Output must be a SINGLE JSON object, not an array. Format:
{
  "suggestion": "your single refined prompt here"
}`;

  const requestBody = {
    system_instruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [
      {
        parts: [
          {
            text: `User's prompt: "${userPrompt}"\n\nProvide 2 improved versions in JSON format.`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      responseMimeType: "application/json"
    }
  };

  // API Key 체크
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('Gemini API Key not configured');
  }

  try {
    console.log('[Fromptly Background] Calling Gemini API...');

    const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Fromptly Background] Gemini API Response:', data);

    // Gemini 응답에서 텍스트 추출
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      throw new Error('Invalid API response structure');
    }

    const responseText = data.candidates[0].content.parts[0].text;

    // JSON 파싱 시도
    try {
      const parsed = JSON.parse(responseText);

      // 배열로 온 경우 첫 번째 요소 사용
      if (Array.isArray(parsed)) {
        console.log('[Fromptly Background] Response is an array, using first element');
        const firstItem = parsed[0];
        return {
          suggestion: firstItem?.suggestion || firstItem || 'Please provide more specific details for better code generation.'
        };
      }

      // 객체로 온 경우
      return {
        suggestion: parsed.suggestion || responseText
      };
    } catch (parseError) {
      console.error('[Fromptly Background] JSON parse error:', parseError);

      // Fallback: 응답 텍스트를 그대로 사용
      return {
        suggestion: responseText.trim() || 'Please provide more specific details for better code generation.'
      };
    }

  } catch (error) {
    console.error('[Fromptly Background] Gemini API call failed:', error);
    throw error;
  }
}

/**
 * 메시지 리스너
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Fromptly Background] Message received:', request);

  if (request.type === 'REFINE_PROMPT') {
    const userPrompt = request.prompt;

    // Gemini API 호출 (비동기)
    refinePromptWithGemini(userPrompt)
      .then(suggestions => {
        sendResponse({ suggestions });
      })
      .catch(error => {
        console.error('[Fromptly Background] Error:', error);

        // 에러 시 Fallback
        sendResponse({
          suggestions: {
            suggestion: 'Please provide more specific details about what you want to build.'
          }
        });
      });

    // 비동기 응답을 위해 true 반환
    return true;
  }
});

console.log('[Fromptly Background] Ready to refine prompts!');
