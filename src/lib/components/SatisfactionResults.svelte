<script>
    /**
     * @typedef {Object} SatisfactionScores
     * @property {string} 전체
     * @property {string} [강사 적극성]
     * @property {string} [강사 전문성]
     */
    /**
     * @typedef {Object} SubjectSatisfaction
     * @property {string} subject
     * @property {SatisfactionScores} scores
     */
    /**
     * @typedef {Object} SatisfactionResults
     * @property {Object<string, SubjectSatisfaction>} satisfactionAverages
     * @property {number} totalSubjects
     * @property {number} totalResponses
     */
    /** @type {{ results: SatisfactionResults }} */
    let { results } = $props();

    // 데이터 존재 여부 확인
    let hasData = $derived(
        results.satisfactionAverages &&
        Object.keys(results.satisfactionAverages).length > 0
    );

    // 질문 목록 (첫 번째 데이터에서 추출)
    let questions = $derived(
        hasData
            ? Object.keys(Object.values(results.satisfactionAverages)[0].scores).filter(q => q !== "전체")
            : []
    );
</script>

{#if hasData}
<div class="mt-6 bg-white rounded border border-neutral-200 p-7">
    <h3 class="text-xl font-medium text-neutral-900 mb-6">과목별 평균 만족도</h3>
    <div class="overflow-x-auto relative">
        <div class="md:hidden text-xs text-neutral-500 mb-2 flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
            </svg>
            좌우로 스크롤하세요
        </div>
        <table class="min-w-full">
            <thead>
                <tr class="border-b border-neutral-300">
                    <th
                        scope="col"
                        class="px-4 py-2.5 text-left text-xs font-medium text-neutral-700 uppercase tracking-wide whitespace-nowrap"
                        >과목명</th
                    >
                    <th
                        scope="col"
                        class="px-4 py-2.5 text-left text-xs font-medium text-neutral-700 uppercase tracking-wide whitespace-nowrap"
                        >전체 평균</th
                    >
                    {#each questions as question}
                        <th
                            scope="col"
                            class="px-4 py-2.5 text-left text-xs font-medium text-neutral-700 uppercase tracking-wide whitespace-nowrap"
                            >{question}</th
                        >
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each Object.values(results.satisfactionAverages) as subjectData}
                    <tr class="border-b border-neutral-200 hover:border-neutral-400 transition-colors duration-150">
                        <td
                            class="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-800"
                            >{subjectData.subject}</td
                        >
                        <td
                            class="px-4 py-3 whitespace-nowrap text-sm text-neutral-800"
                            >{subjectData.scores["전체"]}</td
                        >
                        {#each questions as question}
                            <td
                                class="px-4 py-3 whitespace-nowrap text-sm text-neutral-800"
                                >{subjectData.scores[question]}</td
                            >
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
{:else}
<div class="mt-6 bg-white rounded border border-neutral-200 p-7">
    <h3 class="text-xl font-medium text-neutral-900 mb-6">과목별 평균 만족도</h3>
    <div class="py-12 text-center">
        <svg class="w-12 h-12 text-neutral-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <p class="text-neutral-600">만족도 데이터가 없습니다</p>
        <p class="text-sm text-neutral-500 mt-1">원본데이터 시트를 확인해주세요</p>
    </div>
</div>
{/if}
