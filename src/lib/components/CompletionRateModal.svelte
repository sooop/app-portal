<script>
    import { fade, scale } from 'svelte/transition';
    let {showModal = $bindable(false), subjectCompletionRates=$bindable(), handleCompletionRateChange} = $props();

    // ESC 키로 모달 닫기
    function handleKeydown(event) {
        if (event.key === 'Escape') {
            showModal = false;
        }
    }

    // 배경 클릭 시 모달 닫기
    function handleBackdropClick(event) {
        if (event.target === event.currentTarget) {
            showModal = false;
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
    in:fade={{ duration: 200 }}
    out:fade={{ duration: 150 }}
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
>
        <div
            in:scale={{ duration: 200, start: 0.95 }}
            out:scale={{ duration: 150, start: 0.95 }}
            class="bg-white rounded shadow-xl w-full max-w-2xl h-full max-h-[90vh] flex flex-col"
        >
          <!-- 모달 헤더 - 고정 -->
          <div class="flex items-center justify-between p-5 border-b border-neutral-200 flex-shrink-0">
            <h3 class="text-lg font-medium text-neutral-900">강좌별 이수 조건 설정</h3>
            <button
              onclick={() => {showModal = false}}
              class="p-1.5 hover:bg-neutral-100 rounded transition-colors"
              aria-label="모달 닫기"
            >
              <svg class="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- 모달 콘텐츠 - 스크롤 영역 -->
          <div class="flex-1 overflow-y-auto p-5 min-h-0">
            <div class="space-y-3">
              {#each Object.entries(subjectCompletionRates) as [subject, rate]}
                <div class="flex items-center justify-between p-4 border border-neutral-200 rounded">
                  <div class="flex-1 pr-4">
                    <h4 class="text-sm font-medium text-neutral-900 break-words">{subject}</h4>
                  </div>
                  <div class="flex-shrink-0">
                                          <select
                        value={Math.round(rate * 100)}
                        onchange={(e) => handleCompletionRateChange(subject, parseInt(/** @type {HTMLSelectElement} */ (e.target).value) / 100)}
                        class="px-3 py-2 text-sm border border-neutral-300 rounded bg-white min-w-[80px] whitespace-nowrap"
                      >
                      {#each [30, 40, 50, 60, 70, 80, 90, 100] as percent}
                        <option value={percent}>
                          {percent}%
                        </option>
                      {/each}
                    </select>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- 모달 푸터 - 고정 -->
          <div class="flex justify-end gap-2.5 p-5 border-t border-neutral-200 bg-neutral-50 flex-shrink-0">
            <button
              onclick={() => {showModal = false}}
              class="px-4 py-2 text-sm text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors whitespace-nowrap"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
