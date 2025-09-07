<script>
  import ExcelUploader from '$lib/ExcelUploader.svelte';
  import { analyzeData, downloadExcel } from '$lib/attendance-analyzer.js';
  import { goto } from '$app/navigation';
  import ResultTableByClass from './ResultTableByClass.svelte'; 
  import CompletionRateModal from './CompletionRateModal.svelte';


  // 상태 변수들
  /** @type {File | null} */
  let file = $state(null);
  /** @type {any} */
  let data = $state(null);
  /** @type {boolean} */
  let loading = $state(false);
  /** @type {Record<string, number>} */
  let subjectCompletionRates = $state({}); // 과목별 수료 기준
  /** @type {any} */
  let analysis = $state(null);
  /** @type {string} */
  let error = $state('');
  /** @type {boolean} */
  let showModal = $state(false);

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
  $effect(() => {
    if(data) {
      analysis = analyzeData(data, subjectCompletionRates);
    }
  });
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
      <ResultTableByClass {analysis} onclick={handleDownloadClick} />

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
      <CompletionRateModal bind:showModal={showModal} bind:subjectCompletionRates={subjectCompletionRates} {handleCompletionRateChange} />
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
