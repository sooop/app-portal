<script>
    /** @type {any} */
    let { results } = $props();
</script>
<div class="mt-8 bg-white rounded-lg border border-gray-200 p-8">
    <h3 class="text-2xl font-medium text-gray-900 mb-6">과목별 평균 만족도</h3>
    <div class="overflow-x-auto">
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
