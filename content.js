// Fromptly - Google AI Studio Prompt Refiner
// Content Script

console.log('[Fromptly] Extension loaded');

// 이미 리스너가 부착된 textarea 추적
const attachedTextareas = new WeakSet();

// Debounce timers 추적 (Map으로 변경 - 문자열 키 사용 가능)
const debounceTimers = new Map();

// Suggestion Bar 추적
const suggestionBars = new WeakMap();

// Word Highlight 추적
const wordHighlights = new WeakMap();

// Word Tooltip 추적
const wordTooltips = new WeakMap();

// 개선 가능한 단어 목록 (예시)
const IMPROVABLE_WORDS = [
  {
    word: 'flow from right to left infinitely',
    suggestions: [
      'create an infinite right-to-left slider',
      'implement an infinite right-to-left carousel'
    ]
  },
  {
    word: 'flows from right to left infinitely',
    suggestions: [
      'runs as an infinite right-to-left slider',
      'animates as an infinite right-to-left carousel'
    ]
  }
];

// { word: '버튼', suggestions: ['인터랙티브 버튼', '클릭 가능한 액션 버튼', 'CTA 버튼'] },
  // { word: '예쁘게', suggestions: ['모던한 디자인으로', '세련된 UI로', '미니멀한 스타일로'] },
  // { word: '멋있게', suggestions: ['프로페셔널한 스타일로', '트렌디한 디자인으로', '임팩트 있는 비주얼로'] },
  // { word: '좋게', suggestions: ['효율적으로', '최적화하여', '사용자 친화적으로'] },
  // { word: '대충', suggestions: ['효율적으로', '간결하게', '심플하게'] },
  // { word: '카드', suggestions: ['Material 스타일 카드', 'Glass morphism 카드', '그림자 효과가 있는 카드'] },
  // { word: '페이지', suggestions: ['반응형 페이지', 'SPA 페이지', '다이나믹한 뷰'] }
/**
 * Google AI Studio의 textarea 찾기
 */
function findAllAITextareas() {
  // 모든 textarea 찾기
  const all = document.querySelectorAll('textarea');

  console.log(`[Fromptly] Checking ${all.length} textareas`);

  // 모든 textarea에 적용 (Google AI Studio가 다양한 형태로 textarea를 사용할 수 있음)
  return Array.from(all);
}

/**
 * 텍스트에서 개선 가능한 단어 찾기
 */
function findImprovableWords(text) {
  const found = [];

  IMPROVABLE_WORDS.forEach(({ word, suggestions }) => {
    let index = text.indexOf(word);
    while (index !== -1) {
      found.push({
        word,
        suggestions,
        startIndex: index,
        endIndex: index + word.length
      });
      index = text.indexOf(word, index + 1);
    }
  });

  return found;
}

/**
 * Grammarly 스타일: 텍스트 뒤에 밑줄 표시 (Background Mirror Technique)
 */
function createHighlightOverlay(textarea) {
  // 기존 overlay 제거
  removeHighlightOverlay(textarea);

  const text = textarea.value;
  const improvableWords = findImprovableWords(text);

  if (improvableWords.length === 0) {
    return;
  }

  // Wrapper 생성 (display: grid로 겹치기)
  const wrapper = document.createElement('div');
  wrapper.className = 'fromptly-wrapper';
  wrapper.style.display = 'grid';
  wrapper.style.position = 'relative';

  // Textarea의 원래 width와 display 속성 복사
  const textareaComputedStyle = window.getComputedStyle(textarea);
  wrapper.style.width = textareaComputedStyle.width;
  wrapper.style.maxWidth = textareaComputedStyle.maxWidth;
  wrapper.style.minWidth = textareaComputedStyle.minWidth;

  // Textarea를 wrapper로 감싸기
  textarea.parentElement.insertBefore(wrapper, textarea);
  wrapper.appendChild(textarea);

  // Background div 생성 (밑줄 표시용)
  const backdrop = document.createElement('div');
  backdrop.className = 'fromptly-backdrop';

  const highlights = document.createElement('div');
  highlights.className = 'fromptly-highlights';

  // Textarea 스타일을 highlights에 정확히 복사
  const computedStyle = window.getComputedStyle(textarea);

  // 폰트 관련
  highlights.style.fontFamily = computedStyle.fontFamily;
  highlights.style.fontSize = computedStyle.fontSize;
  highlights.style.fontWeight = computedStyle.fontWeight;
  highlights.style.fontStyle = computedStyle.fontStyle;
  highlights.style.fontVariant = computedStyle.fontVariant;

  // 간격 관련
  highlights.style.letterSpacing = computedStyle.letterSpacing;
  highlights.style.wordSpacing = computedStyle.wordSpacing;
  highlights.style.lineHeight = computedStyle.lineHeight;

  // 패딩과 보더
  highlights.style.padding = computedStyle.padding;
  highlights.style.paddingTop = computedStyle.paddingTop;
  highlights.style.paddingRight = computedStyle.paddingRight;
  highlights.style.paddingBottom = computedStyle.paddingBottom;
  highlights.style.paddingLeft = computedStyle.paddingLeft;

  // 텍스트 관련
  highlights.style.textAlign = computedStyle.textAlign;
  highlights.style.textTransform = computedStyle.textTransform;
  highlights.style.textIndent = computedStyle.textIndent;
  highlights.style.direction = computedStyle.direction;

  // Box sizing
  highlights.style.boxSizing = computedStyle.boxSizing;

  // 색상 복사 (모든 텍스트 보이게)
  highlights.style.color = computedStyle.color;

  console.log('[Fromptly] Copied styles from textarea');

  // 텍스트를 HTML로 변환하면서 밑줄 추가
  let highlightedHTML = '';
  let lastIndex = 0;

  improvableWords.forEach(({ word, suggestions, startIndex, endIndex }) => {
    // 이전 텍스트
    highlightedHTML += escapeHtml(text.substring(lastIndex, startIndex));

    // 밑줄 단어 (span으로 감싸기)
    highlightedHTML += `<span class="fromptly-underline" data-word="${escapeHtml(word)}" data-suggestions='${JSON.stringify(suggestions)}' data-start="${startIndex}" data-end="${endIndex}">${escapeHtml(word)}</span>`;

    lastIndex = endIndex;
  });

  // 남은 텍스트
  highlightedHTML += escapeHtml(text.substring(lastIndex));

  highlights.innerHTML = highlightedHTML;
  backdrop.appendChild(highlights);

  // Wrapper에 backdrop 추가 (textarea 뒤에)
  wrapper.appendChild(backdrop);

  // Textarea와 backdrop을 grid로 겹치기
  backdrop.style.gridArea = '1 / 1 / 2 / 2';
  textarea.style.gridArea = '1 / 1 / 2 / 2';

  // Textarea 스타일 조정 (텍스트만 투명하게, 커서는 보이게)
  const originalColor = computedStyle.color;
  textarea.style.color = 'transparent';
  textarea.style.caretColor = originalColor; // 커서는 원래 색상
  textarea.style.background = 'transparent';
  textarea.style.position = 'relative';
  textarea.style.zIndex = '1'; // 아래로

  // Backdrop은 위에 배치 (이벤트를 받기 위해)
  backdrop.style.position = 'relative';
  backdrop.style.zIndex = '2';
  backdrop.style.pointerEvents = 'none'; // 기본적으로 클릭 통과
  backdrop.style.height = computedStyle.height;
  backdrop.style.minHeight = computedStyle.minHeight;

  // 원래 색상 저장
  wordHighlights.set(textarea, { wrapper, backdrop, syncScroll, originalColor });

  // 밑줄 span에 이벤트 리스너 추가
  const underlineSpans = backdrop.querySelectorAll('.fromptly-underline');
  console.log('[Fromptly] Found underline spans:', underlineSpans.length);

  underlineSpans.forEach(span => {
    // 명시적으로 pointer-events 활성화
    span.style.pointerEvents = 'auto';
    span.style.cursor = 'pointer';

    span.addEventListener('click', () => {
      console.log('[Fromptly] Underline clicked');
      const suggestions = JSON.parse(span.dataset.suggestions);
      const startIndex = parseInt(span.dataset.start);
      const endIndex = parseInt(span.dataset.end);

      showWordTooltip(span, suggestions, textarea, startIndex, endIndex);
    });

    span.addEventListener('mouseenter', () => {
      console.log('[Fromptly] Underline hovered');
      const suggestions = JSON.parse(span.dataset.suggestions);
      const startIndex = parseInt(span.dataset.start);
      const endIndex = parseInt(span.dataset.end);

      showWordTooltip(span, suggestions, textarea, startIndex, endIndex);
    });

    span.addEventListener('mouseleave', () => {
      setTimeout(() => {
        const tooltip = wordTooltips.get(textarea);
        if (tooltip && !tooltip.matches(':hover') && !span.matches(':hover')) {
          hideWordTooltip(textarea);
        }
      }, 100);
    });
  });

  // Scroll 동기화
  function syncScroll() {
    backdrop.scrollTop = textarea.scrollTop;
    backdrop.scrollLeft = textarea.scrollLeft;
  }
  textarea.addEventListener('scroll', syncScroll);

  console.log('[Fromptly] Underlines created for', improvableWords.length, 'words');
}

/**
 * HTML 이스케이프
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Highlight overlay 제거
 */
function removeHighlightOverlay(textarea) {
  const existing = wordHighlights.get(textarea);
  if (existing) {
    if (existing.syncScroll) {
      textarea.removeEventListener('scroll', existing.syncScroll);
    }

    // Wrapper 제거 (wrapper가 backdrop도 포함하고 있음)
    if (existing.wrapper && existing.wrapper.parentElement) {
      // Textarea를 wrapper 밖으로 꺼내기
      existing.wrapper.parentElement.insertBefore(textarea, existing.wrapper);
      existing.wrapper.remove();
    }

    // Textarea 스타일 복원
    textarea.style.color = existing.originalColor || '';
    textarea.style.caretColor = '';
    textarea.style.background = '';
    textarea.style.gridArea = '';
    textarea.style.zIndex = '';

    wordHighlights.delete(textarea);
  }
}

/**
 * 단어 툴팁 표시
 */
function showWordTooltip(targetElement, suggestions, textarea, startIndex, endIndex) {
  // 기존 툴팁 제거
  hideWordTooltip(textarea);

  const tooltip = document.createElement('div');
  tooltip.className = 'fromptly-word-tooltip';

  const title = document.createElement('div');
  title.className = 'fromptly-tooltip-title';
  title.textContent = '추천 표현:';
  tooltip.appendChild(title);

  suggestions.forEach(suggestion => {
    const option = document.createElement('div');
    option.className = 'fromptly-tooltip-option';
    option.textContent = suggestion;

    option.addEventListener('click', () => {
      replaceWord(textarea, startIndex, endIndex, suggestion);
      hideWordTooltip(textarea);
    });

    tooltip.appendChild(option);
  });

  // 위치 계산
  const rect = targetElement.getBoundingClientRect();
  tooltip.style.position = 'fixed';
  tooltip.style.top = (rect.bottom + 5) + 'px';
  tooltip.style.left = rect.left + 'px';

  document.body.appendChild(tooltip);

  // 툴팁에서 마우스가 나가면 닫기
  tooltip.addEventListener('mouseleave', () => {
    hideWordTooltip(textarea);
  });

  // 툴팁 추적
  wordTooltips.set(textarea, tooltip);

  console.log('[Fromptly] Word tooltip shown');
}

/**
 * 단어 툴팁 숨기기
 */
function hideWordTooltip(textarea) {
  const existingTooltip = wordTooltips.get(textarea);
  if (existingTooltip && existingTooltip.parentElement) {
    existingTooltip.remove();
    wordTooltips.delete(textarea);
  }
}

/**
 * Textarea에서 특정 단어를 다른 단어로 교체
 */
function replaceWord(textarea, startIndex, endIndex, newWord) {
  const text = textarea.value;
  const before = text.substring(0, startIndex);
  const after = text.substring(endIndex);

  textarea.value = before + newWord + after;

  // 이벤트 발생
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));

  // Overlay 업데이트
  setTimeout(() => {
    createHighlightOverlay(textarea);
  }, 100);

  console.log('[Fromptly] Word replaced:', newWord);
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

  // Input 이벤트: 단어 하이라이트 + 전체 제안
  textarea.addEventListener('input', (e) => {
    const value = e.target.value;

    // 단어 하이라이트 업데이트 (즉시)
    if (value.length > 0) {
      // Debounce로 하이라이트 업데이트
      const existingHighlightTimer = debounceTimers.get(textarea + '_highlight');
      if (existingHighlightTimer) {
        clearTimeout(existingHighlightTimer);
      }

      const highlightTimer = setTimeout(() => {
        createHighlightOverlay(textarea);
      }, 300); // 300ms 딜레이

      debounceTimers.set(textarea + '_highlight', highlightTimer);
    } else {
      removeHighlightOverlay(textarea);
    }

    // 전체 프롬프트 제안 (기존 로직) - 비활성화
    // const trimmedValue = value.trim();
    // if (trimmedValue.length < 10) {
    //   removeSuggestionBar(textarea);
    //   return;
    // }

    // // Debounce: 1초 대기
    // const existingTimer = debounceTimers.get(textarea);
    // if (existingTimer) {
    //   clearTimeout(existingTimer);
    // }

    // const timer = setTimeout(() => {
    //   requestSuggestions(textarea, trimmedValue);
    // }, 1000);

    // debounceTimers.set(textarea, timer);
  });

  // 텍스트 선택(드래그) 이벤트
  textarea.addEventListener('mouseup', () => {
    handleTextSelection(textarea);
  });

  textarea.addEventListener('keyup', () => {
    handleTextSelection(textarea);
  });

  // 추적에 추가
  attachedTextareas.add(textarea);

  console.log('[Fromptly] Listener attached to textarea');
}

/**
 * 텍스트 선택(드래그) 처리
 */
function handleTextSelection(textarea) {
  const selectionStart = textarea.selectionStart;
  const selectionEnd = textarea.selectionEnd;

  // 선택된 텍스트가 없으면 종료
  if (selectionStart === selectionEnd) {
    return;
  }

  const selectedText = textarea.value.substring(selectionStart, selectionEnd).trim();

  // 선택된 텍스트가 너무 짧으면 종료
  if (selectedText.length < 2) {
    return;
  }

  console.log('[Fromptly] Text selected:', selectedText);

  // 선택된 단어가 개선 가능한 단어 목록에 있는지 확인
  const matchedWord = IMPROVABLE_WORDS.find(item => item.word === selectedText);

  if (matchedWord) {
    console.log('[Fromptly] Selected word matches improvable word:', matchedWord.word);

    // Textarea의 위치를 기준으로 툴팁 표시
    const rect = textarea.getBoundingClientRect();

    // 선택 영역의 대략적인 위치 계산 (간단한 버전)
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20;
    const approximateTop = rect.top + (lineHeight * 2); // 대략적인 위치

    // 임시 div 생성하여 툴팁 위치 지정
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'fixed';
    tempDiv.style.top = approximateTop + 'px';
    tempDiv.style.left = (rect.left + 50) + 'px';
    tempDiv.style.width = '1px';
    tempDiv.style.height = '1px';
    document.body.appendChild(tempDiv);

    showWordTooltip(tempDiv, matchedWord.suggestions, textarea, selectionStart, selectionEnd);

    // 툴팁이 닫힐 때 임시 div 제거
    setTimeout(() => {
      if (tempDiv.parentElement) {
        tempDiv.remove();
      }
    }, 5000);
  }
}

/**
 * 모든 AI Textarea에 리스너 부착
 */
function attachListenersToAllTextareas() {
  const allTextareas = document.querySelectorAll('textarea');
  console.log(`[Fromptly] Total textareas on page: ${allTextareas.length}`);

  const textareas = findAllAITextareas();
  console.log(`[Fromptly] Found ${textareas.length} AI textareas`);

  if (textareas.length === 0) {
    console.warn('[Fromptly] No matching textareas found. Placeholders:');
    allTextareas.forEach((ta, i) => {
      console.log(`  Textarea ${i}: placeholder="${ta.placeholder}"`);
    });
  }

  textareas.forEach(textarea => {
    attachInputListener(textarea);
  });
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
  console.log('[Fromptly] Current URL:', window.location.href);

  // 초기 Textarea 찾기 및 리스너 부착
  attachListenersToAllTextareas();

  // DOM 변화 감지 시작
  observeDOM();

  // 5초 후 다시 체크 (Google AI Studio가 늦게 로드될 수 있음)
  setTimeout(() => {
    console.log('[Fromptly] Re-checking textareas after 5 seconds...');
    attachListenersToAllTextareas();
  }, 5000);

  console.log('[Fromptly] Ready!');
}

// 페이지 로드 완료 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
