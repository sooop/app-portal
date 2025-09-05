<script>
  import ExcelUploader from '$lib/ExcelUploader.svelte';
  import { analyzeSatisfactionData } from '$lib/satisfaction-analyzer.js';
  import { goto } from '$app/navigation';

	// Icons as simple SVG strings
	const icons = {
		upload: `<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>`,
		download: `<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>`,
		fileText: `<svg class="h-5 w-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
		barChart: `<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
		users: `<svg class="h-8 w-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/></svg>`,
		trendingUp: `<svg class="mr-2 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>`,
	};

	/** @type {File | null} */
	let file = null;
 	/** @type {any} */
 	let rawData = null;
 	/** @type {any} */
 	let result = null;
	/** @type {boolean} */
	let analyzing = false;
	/** @type {any} */
	let results = null;
	/** @type {string | null} */
	let downloadUrl = null;
  /** @type {string} */
  let error = '';


  /** @param {any} event */
  async function handleUpload(event) {
    const { rawData } = event.detail;
    if (!rawData) return;

    analyzing = true;
    results = null;
    downloadUrl = null;
    error = '';

    try {
	    const analysisResults = await analyzeSatisfactionData(rawData, /** @type {any} */ (window).XLSX);
	    results = /** @type {any} */ (analysisResults).results;
	    downloadUrl = /** @type {any} */ (analysisResults).downloadUrl;
	  } catch (err) {
	  	error = `분석 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`;
	  	console.error(err);
	  } finally {
	  	analyzing = false;
	  }
  }

  /** @param {any} event */
  function handleUploadError(event) {
    error = event.detail.error;
  }


	// 파일 다운로드
	function handleDownload() {
		if (downloadUrl) {
			const link = document.createElement("a");
			link.href = downloadUrl;
			link.download = `평생교육_만족도분석결과_${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}.xlsx`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}
</script>

<div
	class="max-w-6xl mx-auto p-6 min-h-screen"
>
	<div class="bg-white rounded-xl shadow-lg p-8">
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
        <h1 class="text-3xl text-gray-800">설문 응답 분석기</h1>
      </div>

    {#if !results && !analyzing}
      <div class="mb-8">
        <ExcelUploader
          sheetNamePattern={"원본데이터"}
          headerHint={"연번"}
          title={"설문 조사 결과 파일 업로드"}
          description={"'원본데이터' 시트가 포함된 .xlsx 파일을 선택하거나 드래그하세요."}
          on:uploaddata={handleUpload}
          on:error={handleUploadError}
        />
      </div>
    {/if}

    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 my-4 text-center">
        <p class="text-red-700">{error}</p>
      </div>
    {/if}

		<!-- 분석 진행 상태 -->
		{#if analyzing}
			<div class="text-center mb-8">
				<div
					class="inline-flex items-center px-4 py-2 rounded-lg bg-yellow-100 text-yellow-800"
				>
					<div
						class="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"
					></div>
					분석 중... (데이터를 정규화하고 집계하고 있습니다)
				</div>
			</div>
		{/if}

		<!-- 분석 결과 요약 -->
		{#if results}
			<div class="mb-8">
				<h2
					class="text-2xl font-bold text-gray-800 mb-4 flex items-center"
				>
					{@html icons.trendingUp}
					분석 결과 요약
				</h2>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
					<div class="bg-blue-50 p-4 rounded-lg">
						<div class="flex items-center">
							{@html icons.users}
							<div>
								<p class="text-sm text-blue-600 font-medium">
									총 교육과목 수
								</p>
								<p class="text-2xl font-bold text-blue-800">
									{results.totalSubjects}개
								</p>
							</div>
						</div>
					</div>

					<div class="bg-green-50 p-4 rounded-lg">
						<div class="flex items-center">
							{@html icons.fileText}
							<div>
								<p class="text-sm text-green-600 font-medium">
									총 응답 수
								</p>
								<p class="text-2xl font-bold text-green-800">
									{results.totalResponses}건
								</p>
							</div>
						</div>
					</div>

					<div class="bg-purple-50 p-4 rounded-lg">
						<div class="flex items-center">
							{@html icons.barChart}
							<div>
								<p class="text-sm text-purple-600 font-medium">
									분석 완료
								</p>
								<p class="text-2xl font-bold text-purple-800">
									100%
								</p>
							</div>
						</div>
					</div>
				</div>

				<div class="bg-gray-50 p-4 rounded-lg">
					<h3 class="font-semibold text-gray-800 mb-2">분석 내용</h3>
					<ul class="text-sm text-gray-600 space-y-1">
						<li>
							• 응답자 특성 분석 (성별, 거주지역, 연령대, 직업별
							집계)
						</li>
						<li>• 9개 문항별 만족도 응답 분포 집계</li>
						<li>• 과목별 문항별 평균 만족도 산출</li>
						<li>• 스마트 패턴 매칭 기반 응답 데이터 정규화 적용</li>
					</ul>
				</div>
			</div>
		{/if}

		<!-- 다운로드 버튼 -->
		{#if downloadUrl}
			<div class="text-center">
				<button
					onclick={handleDownload}
					class="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-8 rounded-lg transition-colors flex items-center mx-auto"
				>
					{@html icons.download}
					분석 결과 Excel 파일 다운로드
				</button>
				<p class="text-sm text-gray-500 mt-2">
					3개 시트로 구성: 응답자 특성, 객관식 응답 집계, 평균만족도
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
			"Helvetica Neue", Arial, sans-serif;
	}
</style>
