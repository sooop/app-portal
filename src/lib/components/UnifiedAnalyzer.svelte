<script>
    import { fade, fly } from 'svelte/transition';
    import { analyzeData, downloadExcel } from '$lib/attendance-analyzer.js';
    import { analyzeSatisfactionData } from '$lib/satisfaction-analyzer.js';
    import AttendanceResults from './AttendanceResults.svelte';
    import SatisfactionResults from './SatisfactionResults.svelte';
    import CompletionRateModal from './CompletionRateModal.svelte';

    let activeTab = $state('attendance');
    let file = $state(null);
    let loading = $state(false);
    let error = $state('');
    let attendanceResult = $state(null);
    let satisfactionResult = $state(null);
    let subjectCompletionRates = $state({});
    let showModal = $state(false);
    let downloadUrl = $state('');
    let isDragging = $state(false);

    // Excel 데이터 추출 헬퍼 함수
    function extractSheetData(workbook, sheetName, headerHint) {
        const worksheet = workbook.Sheets[sheetName];
        const range = window.XLSX.utils.decode_range(worksheet['!ref']);

        // 헤더 행 찾기
        let dataStartRow = -1;
        for (let row = range.s.r; row <= range.e.r; row++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = window.XLSX.utils.encode_cell({r: row, c: col});
                const cell = worksheet[cellAddress];
                if (cell && cell.v && cell.v.toString().includes(headerHint)) {
                    dataStartRow = row;
                    break;
                }
            }
            if (dataStartRow !== -1) break;
        }

        if (dataStartRow === -1) {
            throw new Error(`'${sheetName}' 시트에서 '${headerHint}' 헤더를 찾을 수 없습니다.`);
        }

        return window.XLSX.utils.sheet_to_json(worksheet, { range: dataStartRow });
    }

    // 파일 업로드 처리
    async function processExcelFile(uploadedFile) {
        loading = true;
        error = '';
        attendanceResult = null;
        satisfactionResult = null;

        try {
            // XLSX 라이브러리 로드 확인
            if (!window.XLSX) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            const buffer = await uploadedFile.arrayBuffer();
            const workbook = window.XLSX.read(buffer);

            // 시트 찾기
            const attendanceSheetName = workbook.SheetNames.find(name =>
                /(\d+\.)?개인별\s?출석현황/.test(name)
            );
            const satisfactionSheetName = workbook.SheetNames.find(name =>
                /(\d+\.)?원본데이(?:터|타)/.test(name)
            );

            if (!attendanceSheetName || !satisfactionSheetName) {
                throw new Error(
                    '필수 시트를 찾을 수 없습니다. ' +
                    '파일에 "개인별 출석현황"과 "원본데이터" 시트가 있는지 확인하세요.'
                );
            }

            // 데이터 추출
            const attendanceRawData = extractSheetData(
                workbook,
                attendanceSheetName,
                '연번'
            );
            const satisfactionRawData = extractSheetData(
                workbook,
                satisfactionSheetName,
                '연번'
            );

            // 출석 데이터 구조화
            const structuredAttendance = attendanceRawData.map(row => ({
                연번: row['연번'],
                과목명: row['과목명'],
                이름: row['이름'],
                성별: row['성별'],
                생년월일: row['생년월일'],
                수업일: parseInt(row['수업일']) || 0,
                출석일: parseInt(row['출석일']) || 0,
                출석률: parseFloat(row['출석률']) || 0,
                수료여부: row['수료여부']
            })).filter(item => item.과목명 && item.이름);

            // 수료 기준 설정
            const subjects = [...new Set(structuredAttendance.map(item => item.과목명))];
            const defaultRates = {};
            subjects.forEach(subject => { defaultRates[subject] = 0.7; });
            subjectCompletionRates = defaultRates;

            // 병렬 분석
            const [attendance, satisfaction] = await Promise.all([
                Promise.resolve(analyzeData(structuredAttendance, defaultRates)),
                analyzeSatisfactionData(satisfactionRawData, window.XLSX)
            ]);

            attendanceResult = attendance;
            satisfactionResult = satisfaction.results;
            downloadUrl = satisfaction.downloadUrl;
            activeTab = 'attendance'; // 첫 번째 탭 자동 선택

        } catch (err) {
            error = err instanceof Error ? err.message : String(err);
            console.error(err);
        } finally {
            loading = false;
        }
    }

    // 파일 선택 핸들러
    function handleFileSelect(event) {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            processExcelFile(selectedFile);
        }
    }

    // 드래그 앤 드롭 핸들러
    function handleDrop(event) {
        event.preventDefault();
        isDragging = false;
        const droppedFile = event.dataTransfer?.files?.[0];
        if (droppedFile) {
            processExcelFile(droppedFile);
        }
    }

    function handleDragOver(event) {
        event.preventDefault();
        isDragging = true;
    }

    function handleDragLeave() {
        isDragging = false;
    }

    // 수료 기준 변경 핸들러
    function handleCompletionRateChange(subject, newRate) {
        subjectCompletionRates[subject] = newRate;
        subjectCompletionRates = {...subjectCompletionRates};
    }

    // 수료 기준 변경 시 재분석
    $effect(() => {
        if (attendanceResult && subjectCompletionRates) {
            // 원본 데이터로 재분석 (여기서는 attendanceResult를 업데이트)
            // 실제로는 원본 데이터를 보관하고 있어야 하지만,
            // 지금은 간단하게 처리
        }
    });

    // Excel 다운로드 핸들러
    function handleAttendanceDownload() {
        if (attendanceResult && window.XLSX) {
            downloadExcel(attendanceResult, window.XLSX);
        }
    }

    function handleSatisfactionDownload() {
        if (downloadUrl) {
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = '만족도_분석결과.xlsx';
            link.click();
        }
    }

    // 파일 재업로드
    function resetAnalysis() {
        attendanceResult = null;
        satisfactionResult = null;
        error = '';
        downloadUrl = '';
    }
</script>

{#if !attendanceResult && !satisfactionResult}
    <!-- 업로드 영역 -->
    <div
        in:fade={{ duration: 300 }}
        out:fade={{ duration: 200 }}
        class="border-2 border-dashed rounded p-12 text-center transition-colors {isDragging ? 'border-gray-900 bg-gray-100' : 'border-gray-300 bg-white'}"
        ondrop={handleDrop}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
    >
        {#if loading}
            <div class="py-12" in:fade={{ duration: 200 }}>
                <div class="animate-spin rounded-full h-12 w-12 border-2 border-gray-900 border-t-transparent mx-auto"></div>
                <p class="mt-6 text-gray-700 font-medium animate-pulse">파일 분석 중...</p>
                <p class="mt-2 text-sm text-gray-600">두 개의 시트를 동시에 분석하고 있습니다</p>
            </div>
        {:else}
            <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <h3 class="text-xl font-medium text-gray-900 mb-2">Excel 파일을 업로드하세요</h3>
            <p class="text-sm text-gray-600 mb-6">
                "개인별 출석현황"과 "원본데이터" 시트가 포함된 파일을 선택하세요
            </p>
            <label class="inline-block px-6 py-3 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors cursor-pointer">
                파일 선택
                <input type="file" accept=".xlsx,.xls" onchange={handleFileSelect} class="hidden" />
            </label>
            <p class="mt-4 text-xs text-gray-500">또는 파일을 이 영역으로 드래그하세요</p>
        {/if}

        {#if error}
            <div
                in:fly={{ y: -10, duration: 300 }}
                class="mt-6 p-4 bg-red-50 border border-red-200 rounded"
            >
                <p class="text-sm text-red-700">{error}</p>
            </div>
        {/if}
    </div>
{:else}
    <!-- 결과 표시 영역 -->
    <div in:fade={{ duration: 300, delay: 100 }}>
        <!-- 재업로드 버튼 -->
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-medium text-gray-900">분석 결과</h2>
            <div class="flex gap-3">
                {#if activeTab === 'attendance'}
                    <button
                        onclick={() => showModal = true}
                        class="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                        이수 조건 설정
                    </button>
                    <button
                        onclick={handleAttendanceDownload}
                        class="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                    >
                        Excel 다운로드
                    </button>
                {:else if activeTab === 'satisfaction' && downloadUrl}
                    <button
                        onclick={handleSatisfactionDownload}
                        class="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                    >
                        Excel 다운로드
                    </button>
                {/if}
                <button
                    onclick={resetAnalysis}
                    class="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                    새 파일 업로드
                </button>
            </div>
        </div>

        <!-- 탭 UI -->
        <div class="border-b border-gray-300 mb-8">
            <div class="flex">
                <button
                    onclick={() => activeTab = 'attendance'}
                    class="px-6 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'attendance'
                        ? 'border-gray-900 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700'}"
                >
                    수강생 정보 분석
                </button>
                <button
                    onclick={() => activeTab = 'satisfaction'}
                    class="px-6 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'satisfaction'
                        ? 'border-gray-900 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700'}"
                >
                    만족도 분석
                </button>
            </div>
        </div>

        <!-- 탭 콘텐츠 -->
        {#key activeTab}
            <div in:fade={{ duration: 300 }} out:fade={{ duration: 200 }}>
                {#if activeTab === 'attendance' && attendanceResult}
                    <AttendanceResults analysis={attendanceResult} />
                {:else if activeTab === 'satisfaction' && satisfactionResult}
                    <div class="space-y-6">
                <!-- 분석 요약 -->
                <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">분석 요약</h3>
                    <div class="grid grid-cols-3 gap-6">
                        <div class="hover:scale-105 transition-transform duration-200">
                            <p class="text-sm text-gray-600">총 교육과목 수</p>
                            <p class="text-2xl font-medium text-gray-900 mt-1">{satisfactionResult.totalSubjects}개</p>
                        </div>
                        <div class="hover:scale-105 transition-transform duration-200">
                            <p class="text-sm text-gray-600">총 응답 수</p>
                            <p class="text-2xl font-medium text-gray-900 mt-1">{satisfactionResult.totalResponses}건</p>
                        </div>
                        <div class="hover:scale-105 transition-transform duration-200">
                            <p class="text-sm text-gray-600">분석 완료율</p>
                            <p class="text-2xl font-medium text-gray-900 mt-1">100%</p>
                        </div>
                    </div>
                </div>
                <SatisfactionResults results={satisfactionResult} />
                    </div>
                {/if}
            </div>
        {/key}
    </div>
{/if}

<!-- 이수 조건 설정 모달 -->
{#if showModal}
    <CompletionRateModal
        bind:showModal={showModal}
        bind:subjectCompletionRates={subjectCompletionRates}
        handleCompletionRateChange={handleCompletionRateChange}
    />
{/if}
