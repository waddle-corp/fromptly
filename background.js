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
  const systemInstruction = `You are a senior Frontend developer helping a junior Vibe Coder.

The user wrote a vague prompt. Your job: Rewrite it as a detailed, professional prompt that Google AI Studio can execute immediately.

Rules:
1. Transform their vague idea into 2 complete, ready-to-use prompts
2. Version A: Add specific technical details (framework, CSS properties, exact sizes, colors, animations)
3. Version B: Different technical approach or implementation
4. Write as if YOU are ordering the AI (use "~해주세요" commands in Korean)
5. Include concrete specs: layout, features, styling, interactions
6. Each prompt should be complete and immediately usable
7. 50-80 words each
8. Professional but friendly tone

DO NOT give feedback or suggestions. REWRITE their prompt completely.

Output JSON:
{
  "suggestionA": "전문가가 작성한 완성된 프롬프트",
  "suggestionB": "다른 접근의 완성된 프롬프트"
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
      return {
        suggestionA: parsed.suggestionA || parsed.A || parsed.a,
        suggestionB: parsed.suggestionB || parsed.B || parsed.b
      };
    } catch (parseError) {
      console.error('[Fromptly Background] JSON parse error:', parseError);

      // Fallback: 응답을 반으로 나누기
      const lines = responseText.split('\n').filter(l => l.trim());
      return {
        suggestionA: lines[0] || '더 구체적인 설명을 추가해주세요',
        suggestionB: lines[1] || '다른 접근 방식을 시도해보세요'
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
            suggestionA: '구체적인 기술 스택과 요구사항을 명시해주세요',
            suggestionB: '대안적인 접근 방법을 고려해보세요'
          }
        });
      });

    // 비동기 응답을 위해 true 반환
    return true;
  }
});

console.log('[Fromptly Background] Ready to refine prompts!');
