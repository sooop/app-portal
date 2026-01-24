<script>
    import { fade, fly } from 'svelte/transition';
    import { onMount, onDestroy } from 'svelte';
    import ExcelJS from 'exceljs';
    import { analyzeData, downloadExcel } from '$lib/attendance-analyzer.js';
    import { analyzeSatisfactionData } from '$lib/satisfaction-analyzer.js';
    import AttendanceResults from './AttendanceResults.svelte';
    import SatisfactionResults from './SatisfactionResults.svelte';
    import CompletionRateModal from './CompletionRateModal.svelte';
    import FileHistory from './FileHistory.svelte';
    import {
        loadHistoryList,
        addToHistory,
        setCurrentHistoryId,
        clearCurrentSelection
    } from '$lib/db/history-store.svelte.js';

    // 컴포넌트 마운트 시 이력 로드
    onMount(() => {
        loadHistoryList();
    });

    // 컴포넌트 언마운트 시 Blob URL 정리
    onDestroy(() => {
        cleanupDownloadUrl();
        if (errorTimeout) clearTimeout(errorTimeout);
    });

    let activeTab = $state('attendance');
    let file = $state(null);
    let loading = $state(false);
    let loadingStep = $state(''); // 로딩 단계 표시
    let error = $state('');
    let attendanceResult = $state(null);
    let satisfactionResult = $state(null);
    let subjectCompletionRates = $state({});
    let showModal = $state(false);
    let downloadUrl = $state('');
    let isDragging = $state(false);
    let errorTimeout = $state(null); // 에러 자동 소멸 타이머
    let originalAttendanceData = $state(null); // 원본 출석 데이터 (재분석용)
    let satisfactionRawData = $state(null); // 만족도 원본 데이터 (이력 저장용)
    let currentFileName = $state(''); // 현재 파일명
    let currentFileSize = $state(0); // 현재 파일 크기
    let currentFileContent = $state(null); // 현재 파일 ArrayBuffer

    // 파일 크기 제한: 50MB
    const MAX_FILE_SIZE = 50 * 1024 * 1024;

    // Excel 데이터 추출 헬퍼 함수
    function extractSheetData(workbook, sheetName, headerHint) {
        const worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) {
            throw new Error(`'${sheetName}' 시트를 찾을 수 없습니다.`);
        }

        // 헤더 행 찾기
        let dataStartRow = -1;
        let headers = [];

        worksheet.eachRow((row, rowNumber) => {
            if (dataStartRow !== -1) return; // 이미 찾았으면 종료

            row.eachCell((cell) => {
                if (cell.value && cell.value.toString().includes(headerHint)) {
                    dataStartRow = rowNumber;
                    // 헤더 행 저장
                    row.eachCell((headerCell, colNumber) => {
                        headers[colNumber - 1] = headerCell.value ? headerCell.value.toString() : '';
                    });
                }
            });
        });

        if (dataStartRow === -1) {
            throw new Error(`'${sheetName}' 시트에서 '${headerHint}' 헤더를 찾을 수 없습니다.`);
        }

        // 데이터 행 추출
        const data = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= dataStartRow) return; // 헤더 및 이전 행 건너뛰기

            const rowData = {};
            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber - 1];
                if (header) {
                    // ExcelJS의 Rich Text 객체 처리
                    let value = cell.value;
                    if (value && typeof value === 'object') {
                        // Rich Text 객체인 경우
                        if (value.richText) {
                            value = value.richText.map(t => t.text).join('');
                        } else if (value.text) {
                            value = value.text;
                        } else {
                            value = cell.text || String(value);
                        }
                    }
                    rowData[header] = value;
                }
            });

            // 빈 행이 아닌 경우만 추가
            if (Object.keys(rowData).length > 0) {
                data.push(rowData);
            }
        });

        return data;
    }

    // Blob URL cleanup 함수
    function cleanupDownloadUrl() {
        if (downloadUrl) {
            URL.revokeObjectURL(downloadUrl);
            downloadUrl = '';
        }
    }

    // 출석 데이터 구조화 함수
    function structureAttendanceData(rawData) {
        return rawData.map(row => ({
            연번: row['연번'],
            과목명: row['과목명'],
            이름: row['이름'],
            성별: row['성별'],
            생년월일: row['생년월일'],
            수업일: parseInt(row['수업일']) || 0,
            출석일: parseInt(row['출석일']) || 0,
            출석률: (parseFloat(row['출석률']) || 0) / 100,
            수료여부: row['수료여부']
        })).filter(item => item.과목명 && item.이름);
    }

    // 과목별 기본 수료 기준 생성
    function createDefaultCompletionRates(data, defaultRate = 0.7) {
        const subjects = [...new Set(data.map(item => item.과목명))];
        const rates = {};
        subjects.forEach(subject => { rates[subject] = defaultRate; });
        return rates;
    }

    // 에러 설정 함수 (자동 소멸 포함)
    function setError(message) {
        if (errorTimeout) clearTimeout(errorTimeout);
        error = message;
        if (message) {
            errorTimeout = setTimeout(() => {
                error = '';
                errorTimeout = null;
            }, 8000); // 8초 후 자동 소멸
        }
    }

    // 에러 수동 닫기
    function dismissError() {
        if (errorTimeout) clearTimeout(errorTimeout);
        error = '';
        errorTimeout = null;
    }

    // 파일 업로드 처리
    async function processExcelFile(uploadedFile) {
        loading = true;
        loadingStep = '파일 읽는 중...';
        error = '';
        attendanceResult = null;
        satisfactionResult = null;
        cleanupDownloadUrl(); // 이전 Blob URL 정리

        try {
            // 파일 크기 검증
            if (uploadedFile.size > MAX_FILE_SIZE) {
                throw new Error(`파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / (1024 * 1024)}MB까지 업로드 가능합니다.`);
            }

            // 파일 정보 저장
            currentFileName = uploadedFile.name;
            currentFileSize = uploadedFile.size;

            const buffer = await uploadedFile.arrayBuffer();
            currentFileContent = buffer.slice(0); // ArrayBuffer 복사
            loadingStep = 'Excel 파일 파싱 중...';
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);

            // 시트 찾기
            loadingStep = '시트 확인 중...';
            const attendanceSheetName = workbook.worksheets.find(ws =>
                /(\d+\.)?개인별\s?출석현황/.test(ws.name)
            )?.name;
            const satisfactionSheetName = workbook.worksheets.find(ws =>
                /(\d+\.)?원본데이(?:터|타)/.test(ws.name)
            )?.name;

            if (!attendanceSheetName || !satisfactionSheetName) {
                throw new Error(
                    '필수 시트를 찾을 수 없습니다. ' +
                    '파일에 "개인별 출석현황"과 "원본데이터" 시트가 있는지 확인하세요.'
                );
            }

            // 데이터 추출
            loadingStep = '출석 데이터 추출 중...';
            const attendanceRawData = extractSheetData(
                workbook,
                attendanceSheetName,
                '연번'
            );
            loadingStep = '만족도 데이터 추출 중...';
            const extractedSatisfactionData = extractSheetData(
                workbook,
                satisfactionSheetName,
                '연번'
            );

            // 출석 데이터 구조화
            loadingStep = '데이터 구조화 중...';
            const structuredAttendance = structureAttendanceData(attendanceRawData);

            // 수료 기준 설정
            const defaultRates = createDefaultCompletionRates(structuredAttendance);
            subjectCompletionRates = defaultRates;

            // 원본 데이터 저장 (재분석용)
            originalAttendanceData = structuredAttendance;
            satisfactionRawData = extractedSatisfactionData;

            // 병렬 분석
            loadingStep = '데이터 분석 중...';
            const [attendance, satisfaction] = await Promise.all([
                Promise.resolve(analyzeData(structuredAttendance, defaultRates)),
                analyzeSatisfactionData(extractedSatisfactionData, ExcelJS)
            ]);

            attendanceResult = attendance;
            satisfactionResult = satisfaction.results;
            downloadUrl = satisfaction.downloadUrl;
            activeTab = 'attendance'; // 첫 번째 탭 자동 선택

            // IndexedDB에 이력 저장
            loadingStep = '이력 저장 중...';
            try {
                await addToHistory({
                    fileName: currentFileName,
                    fileSize: currentFileSize,
                    fileContent: currentFileContent,
                    structuredAttendanceData: structuredAttendance,
                    satisfactionRawData: extractedSatisfactionData,
                    subjectCompletionRates: defaultRates
                });
            } catch (historyErr) {
                console.warn('이력 저장 실패:', historyErr);
                // 이력 저장 실패는 분석 결과 표시를 막지 않음
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            console.error(err);
        } finally {
            loading = false;
            loadingStep = '';
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
        if (originalAttendanceData && Object.keys(subjectCompletionRates).length > 0) {
            // 원본 데이터로 재분석
            attendanceResult = analyzeData(originalAttendanceData, subjectCompletionRates);
        }
    });

    // Excel 다운로드 핸들러
    async function handleAttendanceDownload() {
        if (attendanceResult) {
            await downloadExcel(attendanceResult, ExcelJS);
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
        cleanupDownloadUrl(); // Blob URL 정리
        attendanceResult = null;
        satisfactionResult = null;
        originalAttendanceData = null;
        satisfactionRawData = null;
        subjectCompletionRates = {};
        currentFileName = '';
        currentFileSize = 0;
        currentFileContent = null;
        clearCurrentSelection();
        error = '';
    }

    /**
     * 이력에서 파일 로드
     * @param {Object} entry - IndexedDB entry
     */
    async function loadFromHistory(entry) {
        loading = true;
        loadingStep = '이력 불러오는 중...';
        error = '';
        attendanceResult = null;
        satisfactionResult = null;
        cleanupDownloadUrl();

        try {
            // 파일 정보 복원
            currentFileName = entry.fileName;
            currentFileSize = entry.fileSize;
            currentFileContent = entry.fileContent;

            // 원본 데이터 복원
            originalAttendanceData = entry.structuredAttendanceData;
            satisfactionRawData = entry.satisfactionRawData;
            subjectCompletionRates = entry.subjectCompletionRates || createDefaultCompletionRates(entry.structuredAttendanceData);

            // 분석 수행
            loadingStep = '데이터 분석 중...';
            const [attendance, satisfaction] = await Promise.all([
                Promise.resolve(analyzeData(originalAttendanceData, subjectCompletionRates)),
                analyzeSatisfactionData(satisfactionRawData, ExcelJS)
            ]);

            attendanceResult = attendance;
            satisfactionResult = satisfaction.results;
            downloadUrl = satisfaction.downloadUrl;
            activeTab = 'attendance';

        } catch (err) {
            setError('파일 불러오기 실패: ' + (err instanceof Error ? err.message : String(err)));
            console.error(err);
        } finally {
            loading = false;
            loadingStep = '';
        }
    }
</script>

{#if !attendanceResult && !satisfactionResult}
    <!-- 업로드 영역 -->
    <div
        in:fade={{ duration: 300 }}
        out:fade={{ duration: 200 }}
        class="border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 {isDragging ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-300 bg-white'}"
        ondrop={handleDrop}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
    >
        {#if loading}
            <div class="py-12" in:fade={{ duration: 200 }}>
                <div class="animate-spin rounded-full h-11 w-11 border-2 border-neutral-900 border-t-transparent mx-auto"></div>
                <p class="mt-5 text-neutral-800 font-medium text-md">{loadingStep || '파일 분석 중...'}</p>
                <p class="mt-2 text-sm text-neutral-600">두 개의 시트를 동시에 분석하고 있습니다</p>
            </div>
        {:else}
            <svg class="w-14 h-14 text-neutral-400 mx-auto mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <h3 class="text-xl font-medium text-neutral-900 mb-2">Excel 파일을 업로드하세요</h3>
            <p class="text-sm text-neutral-600 mb-7">
                "개인별 출석현황"과 "원본데이터" 시트가 포함된 파일을 선택하세요
            </p>
            <div class="flex items-center justify-center gap-3">
                <label class="inline-flex items-center px-5 py-2.5 bg-neutral-900 text-white text-sm rounded hover:bg-neutral-800 transition-all duration-150 cursor-pointer">
                    파일 선택
                    <input type="file" accept=".xlsx,.xls" onchange={handleFileSelect} class="hidden" />
                </label>
                <FileHistory onLoadEntry={loadFromHistory} />
            </div>
            <p class="mt-5 text-xs text-neutral-500">또는 파일을 이 영역으로 드래그하세요</p>
        {/if}

        {#if error}
            <div
                in:fly={{ y: -10, duration: 300 }}
                class="mt-6 p-4 bg-red-50 border border-red-300 rounded-lg flex items-start justify-between gap-3"
            >
                <p class="text-sm text-red-800">{error}</p>
                <button
                    onclick={dismissError}
                    class="text-red-600 hover:text-red-800 flex-shrink-0 transition-colors"
                    aria-label="오류 메시지 닫기"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        {/if}
    </div>
{:else}
    <!-- 결과 표시 영역 -->
    <div in:fade={{ duration: 300, delay: 100 }}>
        <!-- 헤더: 파일명 + 버튼들 -->
        <div class="flex justify-between items-start mb-7">
            <div>
                <h2 class="text-2xl font-medium text-neutral-900">분석 결과</h2>
                {#if currentFileName}
                    <p class="text-sm text-neutral-600 mt-1.5 flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        {currentFileName}
                    </p>
                {/if}
            </div>
            <div class="flex gap-2.5">
                {#if activeTab === 'attendance'}
                    <button
                        onclick={() => showModal = true}
                        class="px-4 py-2 text-sm text-neutral-700 border border-neutral-300 rounded hover:bg-neutral-50 transition-all duration-150"
                    >
                        이수 조건 설정
                    </button>
                    <button
                        onclick={handleAttendanceDownload}
                        class="px-4 py-2 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-all duration-150"
                    >
                        Excel 다운로드
                    </button>
                {:else if activeTab === 'satisfaction' && downloadUrl}
                    <button
                        onclick={handleSatisfactionDownload}
                        class="px-4 py-2 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-all duration-150"
                    >
                        Excel 다운로드
                    </button>
                {/if}
                <FileHistory onLoadEntry={loadFromHistory} />
                <button
                    onclick={resetAnalysis}
                    class="px-4 py-2 text-sm text-neutral-700 border border-neutral-300 rounded hover:bg-neutral-50 transition-all duration-150"
                >
                    새 파일 업로드
                </button>
            </div>
        </div>

        <!-- 탭 UI -->
        <div class="border-b border-neutral-300 mb-8">
            <div class="flex gap-1">
                <button
                    onclick={() => activeTab = 'attendance'}
                    class="px-5 py-2.5 text-sm font-medium border-b-2 transition-all duration-150 {activeTab === 'attendance'
                        ? 'border-neutral-900 text-neutral-900'
                        : 'border-transparent text-neutral-600 hover:text-neutral-800 hover:border-neutral-400'}"
                >
                    수강생 정보 분석
                </button>
                <button
                    onclick={() => activeTab = 'satisfaction'}
                    class="px-5 py-2.5 text-sm font-medium border-b-2 transition-all duration-150 {activeTab === 'satisfaction'
                        ? 'border-neutral-900 text-neutral-900'
                        : 'border-transparent text-neutral-600 hover:text-neutral-800 hover:border-neutral-400'}"
                >
                    만족도 분석
                </button>
            </div>
        </div>

        <!-- 탭 콘텐츠 (DOM 유지로 스크롤 위치 보존) -->
        <div class={activeTab === 'attendance' ? '' : 'hidden'}>
            {#if attendanceResult}
                <AttendanceResults analysis={attendanceResult} />
            {/if}
        </div>
        <div class={activeTab === 'satisfaction' ? '' : 'hidden'}>
            {#if satisfactionResult}
                <div class="space-y-5">
                    <!-- 분석 요약 -->
                    <div class="bg-white rounded border border-neutral-200 p-6">
                        <h3 class="text-md font-medium text-neutral-900 mb-5">분석 요약</h3>
                        <div class="grid grid-cols-3 gap-8">
                            <div>
                                <p class="text-sm text-neutral-600">총 교육과목 수</p>
                                <p class="text-2xl font-medium text-neutral-900 mt-1.5">{satisfactionResult.totalSubjects}개</p>
                            </div>
                            <div>
                                <p class="text-sm text-neutral-600">총 응답 수</p>
                                <p class="text-2xl font-medium text-neutral-900 mt-1.5">{satisfactionResult.totalResponses}건</p>
                            </div>
                            <div>
                                <p class="text-sm text-neutral-600">분석 완료율</p>
                                <p class="text-2xl font-medium text-neutral-900 mt-1.5">100%</p>
                            </div>
                        </div>
                    </div>
                    <SatisfactionResults results={satisfactionResult} />
                </div>
            {/if}
        </div>
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
