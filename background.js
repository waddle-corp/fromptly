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

Transform vague user prompts into specific, actionable prompts that can generate code immediately.

Rules:
1. Provide 2 versions (A: basic implementation, B: alternative approach)
2. Be specific: include CSS properties, exact sizes/colors, animation durations
3. Each prompt 20-40 words (keep it concise)
4. Use "~를 만들어주세요" format (polite Korean imperative)
5. DO NOT specify tech stack (no React, Tailwind, Vue, etc.) - let AI choose
6. Focus on detailed requirements, not implementation details

Examples:
Input: "우측 버튼 애니메이션 구현해줘"
A: "Hello world 섹션의 우측 Add Text 버튼 호버 시 0.3초 동안 scale(1.05)로 커지고 보라색 계열(#4F46E5) 배경색으로 transition하는 CSS 애니메이션을 만들어주세요"
B: "Hello world 섹션의 우측 Add Text 버튼 클릭 시 ripple 효과와 함께 shadow-lg가 추가되는 애니메이션을 구현해주세요"

Input: "카드 레이아웃을 만들어줘"
A: "3열 그리드로 배치된 카드 컴포넌트를 만들어주세요. 각 카드는 320px 너비, 12px 모서리 둥글게, 보통 그림자이고 hover 시 scale(1.02)로 커지도록 해주세요"
B: "반응형 카드 갤러리를 만들어서 PC, 모바일 경험을 고려해 구현해주세요. 모바일은 1열, 태블릿 2열, 데스크톱 3열로 24px 간격을 두고 배치해주세요"

JSON output:
{
  "suggestionA": "detailed prompt in Korean",
  "suggestionB": "alternative detailed prompt in Korean"
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
