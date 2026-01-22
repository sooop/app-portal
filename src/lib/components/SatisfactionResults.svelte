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
</script>
<div class="mt-8 bg-white rounded-lg border border-gray-200 p-8">
    <h3 class="text-2xl font-medium text-gray-900 mb-6">과목별 평균 만족도</h3>
    <div class="overflow-x-auto relative">
        <div class="md:hidden text-xs text-gray-500 mb-2 flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
            </svg>
            좌우로 스크롤하세요
        </div>
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th
                        scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                        >과목명</th
                    >
                    <th
                        scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                        >전체 평균</th
                    >
                    {#each Object.keys(Object.values(results.satisfactionAverages)[0].scores).filter((q) => q !== "전체") as question}
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                            >{question}</th
                        >
                    {/each}
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                {#each Object.values(results.satisfactionAverages) as subjectData}
                    <tr class="hover:bg-gray-50 transition-colors duration-150">
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                            >{subjectData.subject}</td
                        >
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                            >{subjectData.scores["전체"]}</td
                        >
                        {#each Object.keys(subjectData.scores).filter((q) => q !== "전체") as question}
                            <td
                                class="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                                >{subjectData.scores[question]}</td
                            >
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
