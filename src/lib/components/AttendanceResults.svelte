<script>
    let {analysis} = $props();

    // 데이터 존재 여부 확인
    let hasData = $derived(
        analysis &&
        analysis.subjectResults &&
        analysis.subjectResults.length > 0
    );
</script>

{#if hasData}
<div class="bg-white rounded border border-neutral-200 p-7 mb-6">
    <div class="mb-6">
        <h2 class="text-xl font-medium text-neutral-900">과목별 분석 결과</h2>
    </div>

    <div class="overflow-x-auto relative">
        <div class="md:hidden text-xs text-neutral-500 mb-2 flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
            </svg>
            좌우로 스크롤하세요
        </div>
        <table class="min-w-full table-auto">
        <thead>
            <tr class="border-b border-neutral-300">
            <th class="px-4 py-2.5 text-left text-sm font-medium text-neutral-900">과목명</th>
            <th class="px-4 py-2.5 text-center text-sm font-medium text-neutral-900">수강인원</th>
            <th class="px-4 py-2.5 text-center text-sm font-medium text-neutral-900">평균출석률</th>
            <th class="px-4 py-2.5 text-center text-sm font-medium text-neutral-900">수료인원</th>
            <th class="px-4 py-2.5 text-center text-sm font-medium text-neutral-900">수료율</th>
            </tr>
        </thead>
        <tbody>
            {#each analysis.subjectResults as item, index}
            <tr class="border-b border-neutral-200 hover:border-neutral-400 transition-colors duration-150">
                <td class="px-4 py-3 text-sm text-neutral-800">{item.과목명}</td>
                <td class="px-4 py-3 text-center text-sm text-neutral-800">{item.수강인원}</td>
                <td class="px-4 py-3 text-center text-sm text-neutral-800">
                {(item.평균출석률 * 100).toFixed(1)}%
                </td>
                <td class="px-4 py-3 text-center text-sm text-neutral-800">{item.수료인원}</td>
                <td class="px-4 py-3 text-center text-sm text-neutral-800">
                {(item.수료율 * 100).toFixed(1)}%
                </td>
            </tr>
            {/each}
        </tbody>
        </table>
    </div>
</div>
{:else}
<div class="bg-white rounded border border-neutral-200 p-7 mb-6">
    <div class="mb-6">
        <h2 class="text-xl font-medium text-neutral-900">과목별 분석 결과</h2>
    </div>
    <div class="py-12 text-center">
        <svg class="w-12 h-12 text-neutral-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <p class="text-neutral-600">출석 데이터가 없습니다</p>
        <p class="text-sm text-neutral-500 mt-1">개인별 출석현황 시트를 확인해주세요</p>
    </div>
</div>
{/if}

{#if hasData}
<!-- 부가 정보 -->
<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
    <!-- 성별 분포 -->
    <div class="bg-white rounded border border-neutral-200 p-6">
        <h3 class="text-md font-medium text-neutral-900 mb-4">성별 분포</h3>
        <div class="space-y-3">
        {#each Object.entries(analysis.genderDistribution) as [gender, stats]}
            <div class="flex justify-between items-center">
            <span class="text-sm text-neutral-700">{gender}</span>
            <span class="text-sm text-neutral-900 font-medium whitespace-nowrap">
                {stats.명수} ({stats.비율.toFixed(1)}%)
            </span>
            </div>
        {/each}
        </div>
    </div>

    <!-- 수강 강좌수별 분포 -->
    <div class="bg-white rounded border border-neutral-200 p-6">
        <h3 class="text-md font-medium text-neutral-900 mb-4">수강 강좌수별</h3>
        <div class="space-y-3">
        {#each Object.entries(analysis.courseCountDistribution) as [courseCount, stats]}
            <div class="flex justify-between items-center">
            <span class="text-sm text-neutral-700">{courseCount}</span>
            <span class="text-sm text-neutral-900 font-medium whitespace-nowrap">
                {stats.명수} ({stats.비율.toFixed(1)}%)
            </span>
            </div>
        {/each}
        </div>
        <div class="text-sm text-neutral-600 mt-4 pt-3 border-t border-neutral-200">
        총 {analysis.uniqueStudents}명의 고유 수강생
        </div>
    </div>

    <!-- 연령 분포 -->
    <div class="bg-white rounded border border-neutral-200 p-6">
        <h3 class="text-md font-medium text-neutral-900 mb-4">연령대별 분포</h3>
        <div class="space-y-3">
        {#each Object.entries(analysis.ageDistribution) as [ageGroup, stats]}
            <div class="flex justify-between items-center">
            <span class="text-sm text-neutral-700">{ageGroup}</span>
            <span class="text-sm text-neutral-900 font-medium whitespace-nowrap">
                {stats.명수} ({stats.비율.toFixed(1)}%)
            </span>
            </div>
        {/each}
        </div>
        <div class="text-sm text-neutral-600 mt-4 pt-3 border-t border-neutral-200">
        강좌별 집계 (동일인 중복 포함)
        </div>
    </div>
</div>
{/if}
