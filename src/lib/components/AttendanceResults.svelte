<script>
    let {analysis} = $props();
    $inspect(analysis)
</script>


<div class="bg-white rounded-lg border border-gray-200 p-8 mb-6">
    <div class="mb-6">
        <h2 class="text-2xl font-medium text-gray-900">과목별 분석 결과</h2>
    </div>

    <div class="overflow-x-auto">
        <table class="min-w-full table-auto">
        <thead>
            <tr class="bg-gray-100 border-b border-gray-200">
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-900">과목명</th>
            <th class="px-4 py-3 text-center text-sm font-medium text-gray-900">수강인원</th>
            <th class="px-4 py-3 text-center text-sm font-medium text-gray-900">평균출석률</th>
            <th class="px-4 py-3 text-center text-sm font-medium text-gray-900">수료인원</th>
            <th class="px-4 py-3 text-center text-sm font-medium text-gray-900">수료율</th>
            </tr>
        </thead>
        <tbody>
            {#each analysis.subjectResults as item, index}
            <tr class="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                <td class="px-4 py-3 text-gray-900">{item.과목명}</td>
                <td class="px-4 py-3 text-center text-gray-900">{item.수강인원}</td>
                <td class="px-4 py-3 text-center text-gray-900">
                {(item.평균출석률 * 100).toFixed(1)}%
                </td>
                <td class="px-4 py-3 text-center text-gray-900">{item.수료인원}</td>
                <td class="px-4 py-3 text-center text-gray-900">
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
    <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
        <h3 class="text-lg font-medium text-gray-900 mb-4">성별 분포</h3>
        <div class="space-y-3">
        {#each Object.entries(analysis.genderDistribution) as [gender, stats]}
            <div class="flex justify-between items-center">
            <span class="text-gray-700">{gender}</span>
            <span class="text-gray-900 font-medium">
                {stats.명수} ({stats.비율.toFixed(1)}%)
            </span>
            </div>
        {/each}
        </div>
    </div>

    <!-- 수강 강좌수별 분포 -->
    <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
        <h3 class="text-lg font-medium text-gray-900 mb-4">수강 강좌수별</h3>
        <div class="space-y-3">
        {#each Object.entries(analysis.courseCountDistribution) as [courseCount, stats]}
            <div class="flex justify-between items-center">
            <span class="text-gray-700">{courseCount}</span>
            <span class="text-gray-900 font-medium">
                {stats.명수} ({stats.비율.toFixed(1)}%)
            </span>
            </div>
        {/each}
        </div>
        <div class="text-sm text-gray-600 mt-4 pt-3 border-t border-gray-200">
        총 {analysis.uniqueStudents}명의 고유 수강생
        </div>
    </div>

    <!-- 연령 분포 -->
    <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
        <h3 class="text-lg font-medium text-gray-900 mb-4">연령대별 분포</h3>
        <div class="space-y-3">
        {#each Object.entries(analysis.ageDistribution) as [ageGroup, stats]}
            <div class="flex justify-between items-center">
            <span class="text-gray-700">{ageGroup}</span>
            <span class="text-gray-900 font-medium">
                {stats.명수} ({stats.비율.toFixed(1)}%)
            </span>
            </div>
        {/each}
        </div>
        <div class="text-sm text-gray-600 mt-4 pt-3 border-t border-gray-200">
        강좌별 집계 (동일인 중복 포함)
        </div>
    </div>
</div>
