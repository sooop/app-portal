<script>
  import ExcelUploader from '$lib/ExcelUploader.svelte';
  import { analyzeData, downloadExcel } from '$lib/attendance-analyzer.js';
  import { goto } from '$app/navigation';

  // 상태 변수들
  /** @type {File | null} */
  let file = null;
  /** @type {any} */
  let data = null;
  /** @type {boolean} */
  let loading = false;
  /** @type {Record<string, number>} */
  let subjectCompletionRates = {}; // 과목별 수료 기준
  /** @type {any} */
  let analysis = null;
  /** @type {string} */
  let error = '';
  /** @type {boolean} */
  let showModal = false;

  /** @param {{ file: File; rawData: any[]; }} detail */
  function handleUpload(detail) {
    const { file: uploadedFile, rawData } = detail;
    
    file = uploadedFile;
    data = null;
    analysis = null;
    error = '';
    loading = true;

    try {
      // 데이터 구조화
      const structuredData = rawData.map(/** @param {any} row */ row => ({
        연번: row['연번'],
        과목명: row['과목명'],
        이름: row['이름'],
        성별: row['성별'],
        생년월일: row['생년월일'],
        수업일: parseInt(row['수업일']) || 0,
        출석일: parseInt(row['출석일']) || 0,
        출석률: parseFloat(row['출석률']) || 0,
        수료여부: row['수료여부']
      })).filter(/** @param {any} item */ item => item.과목명 && item.이름);

      // 과목별 기본 수료율 설정 (70%)
      const subjects = [...new Set(structuredData.map(/** @param {any} item */ item => item.과목명))];
      /** @type {Record<string, number>} */
      const defaultRates = {};
      subjects.forEach(/** @param {any} subject */ subject => {
        defaultRates[subject] = 0.7;
      });
      subjectCompletionRates = defaultRates;
      data = structuredData;
    } catch (err) {
      error = '업로드된 데이터 처리 중 오류가 발생했습니다: ' + (err instanceof Error ? err.message : String(err));
      console.error(err);
    } finally {
      loading = false;
    }
  }

  /** @param {{ error: string; }} detail */
  function handleUploadError(detail) {
    error = detail.error;
    data = null;
    analysis = null;
  }

  function handleDownloadClick() {
    // XLSX 객체는 ExcelUploader.svelte의 CDN 스크립트를 통해 전역으로 사용 가능합니다.
    downloadExcel(analysis, /** @type {any} */ (window).XLSX);
  }

  // 과목별 수료율 변경 핸들러
  /**
     * @param {string} subject
     * @param {number} rate
     */
  function handleCompletionRateChange(subject, rate) {
    subjectCompletionRates = {
      ...subjectCompletionRates,
      [subject]: rate
    };
  }

  // 총 수료 건수 계산 함수
  /**
   * @param {any} analysis
   * @returns {number}
   */
  function getTotalCompletionCount(analysis) {
    let total = 0;
    for (const item of analysis.subjectResults) {
      total += item.수료인원;
    }
    return total;
  }

  // 데이터나 수료 기준이 변경되면 자동으로 재분석
  $: if (data) {
    analysis = analyzeData(data, subjectCompletionRates);
  }
</script>

<div class="min-h-screen p-6 relative z-[2]">
  <div class="max-w-6xl mx-auto">
    <div class="opacity-90 bg-white rounded-lg shadow-lg p-6 mb-6">
      <div class="flex items-center gap-3 mb-6">
        <button 
          onclick={() => goto('/')}
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          title="이전 페이지로 돌아가기"
          aria-label="이전 페이지로 돌아가기"
        >
          <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
        </button>
        <h1 class="text-3xl text-gray-800">수강정보분석기</h1>
      </div>

      {#if !data}
        <ExcelUploader
          sheetNamePattern={"(\\d+\\.)?개인별\\s?출석현황"}
          headerHint={"연번"}
          description={"'개인별 출석현황' 시트가 포함된 .xlsx 또는 .xls 파일을 업로드하면 자동으로 분석이 시작됩니다."}
          onUpload={handleUpload}
          onError={handleUploadError}
        />
      {/if}

      {#if loading}
        <div class="flex items-center gap-2 text-blue-600 mb-4">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          데이터를 분석하는 중...
        </div>
      {/if}

      {#if error}
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p class="text-red-700">{error}</p>
        </div>
      {/if}

      <!-- 파일 정보 및 강좌별 이수 조건 설정 버튼 -->
      {#if data}
        <div class="flex items-center justify-between mb-6">
          <div class="text-sm text-gray-600">
            분석된 파일: <span class="font-medium">{file?.name}</span>
          </div>
          <button
            onclick={() => showModal = true}
            class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            강좌별 이수 조건
          </button>
        </div>
      {/if}
    </div>

    <!-- 분석 결과 -->
    {#if analysis}
      <!-- 과목별 결과 -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <h2 class="text-2xl font-bold text-gray-800">과목별 분석 결과</h2>
          </div>
          <button
            onclick={handleDownloadClick}
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

      <!-- 요약 정보 -->
      <div class="bg-white rounded-lg shadow-lg p-6 mt-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">요약 정보</h3>
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-blue-50 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-blue-600">{analysis.subjectResults.length}</div>
            <div class="text-sm text-gray-600">총 강좌 수</div>
          </div>
          <div class="bg-green-50 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-green-600">{analysis.totalStudents}</div>
            <div class="text-sm text-gray-600">총 수강 건수</div>
          </div>
          <div class="bg-purple-50 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-purple-600">{analysis.uniqueStudents}</div>
            <div class="text-sm text-gray-600">고유 수강생 수</div>
          </div>
          <div class="bg-orange-50 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-orange-600">
              {getTotalCompletionCount(analysis)}
            </div>
            <div class="text-sm text-gray-600">총 수료 건수</div>
          </div>
        </div>
      </div>
    {/if}

    <!-- 강좌별 이수 조건 설정 모달 -->
    {#if showModal}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl h-full max-h-[90vh] flex flex-col">
          <!-- 모달 헤더 - 고정 -->
          <div class="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <h3 class="text-xl font-bold text-gray-800">강좌별 이수 조건 설정</h3>
            <button
              onclick={() => showModal = false}
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
              onclick={() => showModal = false}
              class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              닫기
            </button>
            <button
              onclick={() => showModal = false}
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              적용
            </button>
          </div>
        </div>
      </div>
    {/if}

    {#if data && !analysis}
      <div class="bg-white rounded-lg shadow-lg p-6">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600">데이터를 분석하는 중입니다...</p>
        </div>
      </div>
    {/if}
  </div>
</div>
