// Fromptly - Google AI Studio Prompt Refiner
// Content Script

console.log('[Fromptly] Extension loaded');

// 이미 리스너가 부착된 textarea 추적
const attachedTextareas = new WeakSet();

// Debounce timers 추적
const debounceTimers = new WeakMap();

// Suggestion Bar 추적
const suggestionBars = new WeakMap();

/**
 * Google AI Studio의 textarea 찾기
 */
function findAllAITextareas() {
  const all = document.querySelectorAll('textarea[cdktextareaautosize]');

  return Array.from(all).filter(ta => {
    const ph = ta.placeholder;
    return ph && (
      ph.includes('Describe your idea') ||
      ph.includes('Make changes')
    );
  });
}

/**
 * Suggestion Bar HTML 생성
 */
function createSuggestionBar(suggestionA, suggestionB) {
  const bar = document.createElement('div');
  bar.className = 'fromptly-suggestions';

  const optionA = document.createElement('div');
  optionA.className = 'fromptly-suggestion fromptly-suggestion-a';
  optionA.innerHTML = `🅰️ ${suggestionA}`;

  const optionB = document.createElement('div');
  optionB.className = 'fromptly-suggestion fromptly-suggestion-b';
  optionB.innerHTML = `🅱️ ${suggestionB}`;

  bar.appendChild(optionA);
  bar.appendChild(optionB);

  return bar;
}

/**
 * Suggestion Bar 표시
 */
function showSuggestionBar(textarea, suggestionA, suggestionB) {
  // 기존 Bar 제거
  removeSuggestionBar(textarea);

  // 새 Bar 생성
  const bar = createSuggestionBar(suggestionA, suggestionB);

  // Textarea 다음에 삽입
  textarea.parentElement.insertBefore(bar, textarea.nextSibling);

  // Bar 추적
  suggestionBars.set(textarea, bar);

  // Click 이벤트 추가
  const optionA = bar.querySelector('.fromptly-suggestion-a');
  const optionB = bar.querySelector('.fromptly-suggestion-b');

  optionA.addEventListener('click', () => {
    applySuggestion(textarea, suggestionA);
  });

  optionB.addEventListener('click', () => {
    applySuggestion(textarea, suggestionB);
  });

  console.log('[Fromptly] Suggestion bar displayed');
}

/**
 * Suggestion Bar 제거
 */
function removeSuggestionBar(textarea) {
  const existingBar = suggestionBars.get(textarea);
  if (existingBar && existingBar.parentElement) {
    existingBar.remove();
    suggestionBars.delete(textarea);
  }
}

/**
 * 제안 적용
 */
function applySuggestion(textarea, suggestionText) {
  // 🅰️ 또는 🅱️ 제거
  const cleanText = suggestionText.replace(/^🅰️\s*/, '').replace(/^🅱️\s*/, '');

  // Textarea에 적용
  textarea.value = cleanText;

  // Angular가 감지할 수 있도록 이벤트 발생
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));

  // Bar 제거
  removeSuggestionBar(textarea);

  console.log('[Fromptly] Suggestion applied:', cleanText);
}

/**
 * LLM에게 제안 요청
 */
function requestSuggestions(textarea, userPrompt) {
  console.log('[Fromptly] Requesting suggestions for:', userPrompt);

  // Background worker에 메시지 전송
  chrome.runtime.sendMessage(
    {
      type: 'REFINE_PROMPT',
      prompt: userPrompt
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Fromptly] Error:', chrome.runtime.lastError);
        // Phase 1: 에러 시 하드코딩 제안 표시
        showHardcodedSuggestions(textarea);
        return;
      }

      if (response && response.suggestions) {
        const { suggestionA, suggestionB } = response.suggestions;
        showSuggestionBar(textarea, suggestionA, suggestionB);
      } else {
        // Fallback: 하드코딩 제안
        showHardcodedSuggestions(textarea);
      }
    }
  );
}

/**
 * 하드코딩 제안 표시 (Phase 1 / Fallback)
 */
function showHardcodedSuggestions(textarea) {
  const suggestionA = '버튼 호버 시 0.3초 동안 scale(1.1)로 커지는 애니메이션을 추가해주세요';
  const suggestionB = '버튼 클릭 시 ripple 효과와 함께 배경색이 부드럽게 변하는 애니메이션을 만들어주세요';

  showSuggestionBar(textarea, suggestionA, suggestionB);
}

/**
 * Textarea에 Input 리스너 부착
 */
function attachInputListener(textarea) {
  // 이미 부착되었으면 스킵
  if (attachedTextareas.has(textarea)) {
    return;
  }

  textarea.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    console.log('[Fromptly] Input value:', value);

    // 빈 값이면 제안 바 제거
    if (value.length === 0) {
      removeSuggestionBar(textarea);
      return;
    }

    // Debounce: 1초 대기
    const existingTimer = debounceTimers.get(textarea);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      requestSuggestions(textarea, value);
    }, 1000);

    debounceTimers.set(textarea, timer);
  });

  // 추적에 추가
  attachedTextareas.add(textarea);

  console.log('[Fromptly] Listener attached to textarea');
}

/**
 * 모든 AI Textarea에 리스너 부착
 */
function attachListenersToAllTextareas() {
  const textareas = findAllAITextareas();

  textareas.forEach(textarea => {
    attachInputListener(textarea);
  });

  console.log(`[Fromptly] Found ${textareas.length} AI textareas`);
}

/**
 * DOM 변화 감지 (새 Textarea 추가 감지)
 */
function observeDOM() {
  const observer = new MutationObserver((mutations) => {
    // 새 textarea가 추가되었는지 확인
    const textareas = findAllAITextareas();
    textareas.forEach(textarea => {
      if (!attachedTextareas.has(textarea)) {
        attachInputListener(textarea);
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('[Fromptly] DOM observer started');
}

/**
 * 초기화
 */
function init() {
  console.log('[Fromptly] Initializing...');

  // 초기 Textarea 찾기 및 리스너 부착
  attachListenersToAllTextareas();

  // DOM 변화 감지 시작
  observeDOM();

  console.log('[Fromptly] Ready!');
}

// 페이지 로드 완료 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
