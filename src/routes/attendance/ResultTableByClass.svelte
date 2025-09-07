<script>
    let {onclick, analysis} = $props();
    $inspect(analysis)
</script>


<div class="bg-white rounded-lg shadow-lg p-6 mb-6">
    <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
        </svg>
        <h2 class="text-2xl font-bold text-gray-800">과목별 분석 결과</h2>
        </div>
        <button
        {onclick}
        class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        엑셀 다운로드
        </button>
    </div>

    <div class="overflow-x-auto">
        <table class="min-w-full table-auto">
        <thead>
            <tr class="bg-gray-100">
            <th class="px-4 py-3 text-left font-semibold text-gray-800">과목명</th>
            <th class="px-4 py-3 text-center font-semibold text-gray-800">수강인원</th>
            <th class="px-4 py-3 text-center font-semibold text-gray-800">평균출석률</th>
            <th class="px-4 py-3 text-center font-semibold text-gray-800">수료인원</th>
            <th class="px-4 py-3 text-center font-semibold text-gray-800">수료율</th>
            </tr>
        </thead>
        <tbody>
            {#each analysis.subjectResults as item, index}
            <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="px-4 py-3 text-gray-800">{item.과목명}</td>
                <td class="px-4 py-3 text-center text-gray-800">{item.수강인원}</td>
                <td class="px-4 py-3 text-center text-gray-800">
                {(item.평균출석률 * 100).toFixed(1)}%
                </td>
                <td class="px-4 py-3 text-center text-gray-800">{item.수료인원}</td>
                <td class="px-4 py-3 text-center text-gray-800">
                {(item.수료율 * 100).toFixed(1)}%
                </td>
            </tr>
            {/each}
        </tbody>
        </table>
    </div>
    </div>
    <!-- 부가 정보 -->
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
    <!-- 성별 분포 -->
    <div class="bg-white rounded-lg shadow-lg p-6">
        <div class="flex items-center gap-3 mb-4">
        <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
        </svg>
        <h3 class="text-xl font-bold text-gray-800">성별 분포</h3>
        </div>
        <div class="space-y-3">
        {#each Object.entries(analysis.genderDistribution) as [gender, stats]}
            <div class="flex justify-between items-center">
            <span class="text-gray-700 font-medium">{gender}</span>
            <span class="text-gray-800">
                {stats.명수} ({stats.비율.toFixed(1)}%)
            </span>
            </div>
        {/each}
        </div>
    </div>

    <!-- 수강 강좌수별 분포 -->
    <div class="bg-white rounded-lg shadow-lg p-6">
        <div class="flex items-center gap-3 mb-4">
        <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <h3 class="text-xl font-bold text-gray-800">수강 강좌수별</h3>
        </div>
        <div class="space-y-3">
        {#each Object.entries(analysis.courseCountDistribution) as [courseCount, stats]}
            <div class="flex justify-between items-center">
            <span class="text-gray-700 font-medium">{courseCount}</span>
            <span class="text-gray-800">
                {stats.명수} ({stats.비율.toFixed(1)}%)
            </span>
            </div>
        {/each}
        </div>
        <div class="text-sm text-gray-600 mt-3">
        총 {analysis.uniqueStudents}명의 고유 수강생
        </div>
    </div>

    <!-- 연령 분포 -->
    <div class="bg-white rounded-lg shadow-lg p-6">
        <div class="flex items-center gap-3 mb-4">
        <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
        </svg>
        <h3 class="text-xl font-bold text-gray-800">연령대별 분포</h3>
        </div>
        <div class="space-y-3">
        {#each Object.entries(analysis.ageDistribution) as [ageGroup, stats]}
            <div class="flex justify-between items-center">
            <span class="text-gray-700 font-medium">{ageGroup}</span>
            <span class="text-gray-800">
                {stats.명수} ({stats.비율.toFixed(1)}%)
            </span>
            </div>
        {/each}
        </div>
        <div class="text-sm text-gray-600 mt-3">
        강좌별 집계 (동일인 중복 포함)
        </div>
    </div>
</div>
