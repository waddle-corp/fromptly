// Fromptly - Google AI Studio Prompt Refiner
// Content Script

console.log('[Fromptly] Extension loaded');

// 이미 리스너가 부착된 textarea 추적
const attachedTextareas = new WeakSet();

// Debounce timers 추적
const debounceTimers = new WeakMap();

// Suggestion Bar 추적
const suggestionBars = new WeakMap();

// Loading Bar 추적
const loadingBars = new WeakMap();

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
 * Loading Bar HTML 생성
 */
function createLoadingBar() {
  const bar = document.createElement('div');
  bar.className = 'fromptly-loading';
  bar.innerHTML = `
    <div class="fromptly-loading-content">
      <span class="fromptly-loading-text">Generating suggestions</span>
      <span class="fromptly-loading-dots">
        <span>.</span><span>.</span><span>.</span>
      </span>
    </div>
  `;
  return bar;
}

/**
 * Suggestion Bar HTML 생성
 */
function createSuggestionBar(suggestion, options = []) {
  const bar = document.createElement('div');
  bar.className = 'fromptly-suggestions';

  // Suggestion 컨테이너
  const suggestionContainer = document.createElement('div');
  suggestionContainer.className = 'fromptly-suggestion-container';

  // Suggestion 타이틀
  const suggestionLabel = document.createElement('div');
  suggestionLabel.className = 'fromptly-suggestion-label';
  suggestionLabel.textContent = 'Full Suggestion:';
  suggestionContainer.appendChild(suggestionLabel);

  // Suggestion 영역
  const suggestionDiv = document.createElement('div');
  suggestionDiv.className = 'fromptly-suggestion';
  suggestionDiv.textContent = suggestion;
  suggestionContainer.appendChild(suggestionDiv);

  bar.appendChild(suggestionContainer);

  // Options 영역 (옵션이 있을 경우만)
  if (options && options.length > 0) {
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'fromptly-options';

    const optionsLabel = document.createElement('div');
    optionsLabel.className = 'fromptly-options-label';
    optionsLabel.textContent = 'Options:';
    optionsContainer.appendChild(optionsLabel);

    const optionsButtons = document.createElement('div');
    optionsButtons.className = 'fromptly-options-buttons';

    options.forEach((optionText, index) => {
      const button = document.createElement('button');
      button.className = 'fromptly-option-button';
      button.textContent = optionText;
      button.dataset.optionIndex = index;
      optionsButtons.appendChild(button);
    });

    optionsContainer.appendChild(optionsButtons);
    bar.appendChild(optionsContainer);
  }

  return bar;
}

/**
 * Suggestion Bar 표시
 */
function showSuggestionBar(textarea, suggestion, options = []) {
  // 기존 Bar 제거
  removeSuggestionBar(textarea);

  // 새 Bar 생성
  const bar = createSuggestionBar(suggestion, options);

  // actions-container 찾기 (textarea의 상위 DOM에서 검색)
  let container = textarea;
  let actionsContainer = null;

  // 최대 10단계까지 상위 요소 탐색
  for (let i = 0; i < 10; i++) {
    container = container.parentElement;
    if (!container) break;

    actionsContainer = container.querySelector('.actions-container');
    if (actionsContainer) break;
  }

  // actions-container를 찾았으면 그 바로 위에 삽입, 못 찾았으면 textarea 다음에 삽입
  if (actionsContainer && actionsContainer.parentElement) {
    actionsContainer.parentElement.insertBefore(bar, actionsContainer);
    console.log('[Fromptly] Suggestion bar inserted before actions-container');
  } else {
    textarea.parentElement.insertBefore(bar, textarea.nextSibling);
    console.log('[Fromptly] Suggestion bar inserted after textarea (fallback)');
  }

  // Bar 추적
  suggestionBars.set(textarea, bar);

  // Suggestion 클릭 이벤트
  const suggestionDiv = bar.querySelector('.fromptly-suggestion');
  suggestionDiv.addEventListener('click', () => {
    applySuggestion(textarea, suggestion);
  });

  // Options 클릭 이벤트
  const optionButtons = bar.querySelectorAll('.fromptly-option-button');
  optionButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const optionText = button.textContent;
      appendOption(textarea, optionText);

      // 클릭된 버튼 제거 (fade-out 애니메이션)
      button.style.opacity = '0';
      setTimeout(() => {
        button.remove();
      }, 200);
    });
  });

  console.log('[Fromptly] Suggestion bar displayed with options:', options);
}

/**
 * Loading Bar 표시
 */
function showLoadingBar(textarea) {
  // 기존 Loading Bar 및 Suggestion Bar 제거
  removeLoadingBar(textarea);
  removeSuggestionBar(textarea);

  // 새 Loading Bar 생성
  const bar = createLoadingBar();

  // actions-container 찾기 (Suggestion Bar와 동일한 로직)
  let container = textarea;
  let actionsContainer = null;

  for (let i = 0; i < 10; i++) {
    container = container.parentElement;
    if (!container) break;

    actionsContainer = container.querySelector('.actions-container');
    if (actionsContainer) break;
  }

  // 삽입
  if (actionsContainer && actionsContainer.parentElement) {
    actionsContainer.parentElement.insertBefore(bar, actionsContainer);
  } else {
    textarea.parentElement.insertBefore(bar, textarea.nextSibling);
  }

  // Bar 추적
  loadingBars.set(textarea, bar);

  console.log('[Fromptly] Loading bar displayed');
}

/**
 * Loading Bar 제거
 */
function removeLoadingBar(textarea) {
  const existingBar = loadingBars.get(textarea);
  if (existingBar && existingBar.parentElement) {
    existingBar.remove();
    loadingBars.delete(textarea);
  }
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
 * 제안 적용 (textarea 전체 대체)
 */
function applySuggestion(textarea, suggestionText) {
  // Badge는 HTML이므로 직접 사용 (이미 텍스트만 전달됨)
  const cleanText = suggestionText;

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
 * 옵션 추가 (textarea 하단에 append)
 */
function appendOption(textarea, optionText) {
  const currentValue = textarea.value;

  // 줄바꿈 후 "- ..." 형식으로 추가
  const newValue = currentValue + '\n- ' + optionText;

  // Textarea에 적용
  textarea.value = newValue;

  // Angular가 감지할 수 있도록 이벤트 발생
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));

  console.log('[Fromptly] Option appended:', optionText);
}

/**
 * LLM에게 제안 요청
 */
function requestSuggestions(textarea, userPrompt) {
  console.log('[Fromptly] Requesting suggestions for:', userPrompt);

  // 로딩 바 표시
  showLoadingBar(textarea);

  let suggestionResponse = null;
  let optionsResponse = null;

  // Suggestion과 Options 병렬 요청
  const suggestionPromise = new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'REFINE_PROMPT', prompt: userPrompt },
      (response) => {
        suggestionResponse = response;
        resolve();
      }
    );
  });

  const optionsPromise = new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'REFINE_OPTIONS', prompt: userPrompt },
      (response) => {
        optionsResponse = response;
        resolve();
      }
    );
  });

  // 두 요청 모두 완료 대기
  Promise.all([suggestionPromise, optionsPromise]).then(() => {
    // 로딩 바 제거
    removeLoadingBar(textarea);

    if (chrome.runtime.lastError) {
      console.error('[Fromptly] Error:', chrome.runtime.lastError);
      showHardcodedSuggestions(textarea);
      return;
    }

    // Suggestion 추출
    const suggestion = suggestionResponse?.suggestions?.suggestion;

    // Options 추출
    const options = optionsResponse?.options?.options || [];

    if (suggestion) {
      showSuggestionBar(textarea, suggestion, options);
    } else {
      // Fallback: 하드코딩 제안
      showHardcodedSuggestions(textarea);
    }
  });
}

/**
 * 하드코딩 제안 표시 (Phase 1 / Fallback)
 */
function showHardcodedSuggestions(textarea) {
  const suggestion = 'Add a smooth hover animation to the button with a natural scale-up effect and appropriate transition timing. Make it clear that the element is interactive.';
  const options = ['with a smooth scale-up on hover', 'with a ripple effect on click'];

  showSuggestionBar(textarea, suggestion, options);
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
