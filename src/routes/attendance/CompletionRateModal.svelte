<script>
    let {showModal = $bindable(false), subjectCompletionRates=$bindable(), handleCompletionRateChange} = $props();
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl h-full max-h-[90vh] flex flex-col">
          <!-- 모달 헤더 - 고정 -->
          <div class="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <h3 class="text-xl font-bold text-gray-800">강좌별 이수 조건 설정</h3>
            <button
              onclick={() => {showModal = false}}
              class="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="모달 닫기"
            >
              <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- 모달 콘텐츠 - 스크롤 영역 -->
          <div class="flex-1 overflow-y-auto p-6 min-h-0">
            <div class="space-y-4">
              {#each Object.entries(subjectCompletionRates) as [subject, rate]}
                <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div class="flex-1 pr-4">
                    <h4 class="font-medium text-gray-800 break-words">{subject}</h4>
                  </div>
                  <div class="flex-shrink-0">
                                          <select
                        value={Math.round(rate * 100)}
                        onchange={(e) => handleCompletionRateChange(subject, parseInt(/** @type {HTMLSelectElement} */ (e.target).value) / 100)}
                        class="px-3 py-2 border border-gray-300 rounded-md bg-white min-w-[80px]"
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
          <div class="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onclick={() => {showModal = false}}
              class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>