<svelte:head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
</svelte:head>

<script>
  import { onMount } from 'svelte';

  // 상태 변수들
  let file = null;
  let data = null;
  let loading = false;
  let subjectCompletionRates = {}; // 과목별 수료 기준
  let analysis = null;
  let error = '';
  let isDragOver = false;
  let showModal = false;

  // DOM 참조
  let dropZoneRef;
  let fileInputRef;

  // 파일 처리 함수
  async function processFile(uploadedFile) {
    file = uploadedFile;
    loading = true;
    error = '';

    try {
      const buffer = await uploadedFile.arrayBuffer();
      const workbook = window.XLSX.read(buffer, {
        cellStyles: true,
        cellFormulas: true,
        cellDates: true,
        cellNF: true,
        sheetStubs: true
      });

      // "개인별 출석현황" 또는 "개인별출석현황" 시트 찾기
      let sheetName = workbook.SheetNames.find(name =>
        name.includes('개인별 출석현황') || name.includes('개인별출석현황')
      );

      if (!sheetName) {
        throw new Error('개인별 출석현황 시트를 찾을 수 없습니다.');
      }

      const worksheet = workbook.Sheets[sheetName];
      const range = window.XLSX.utils.decode_range(worksheet['!ref']);

      // "연번" 셀 찾기
      let dataStartRow = -1;
      let dataStartCol = -1;

      for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = window.XLSX.utils.encode_cell({r: row, c: col});
          const cell = worksheet[cellAddress];
          if (cell && cell.v && cell.v.toString().includes('연번')) {
            dataStartRow = row;
            dataStartCol = col;
            break;
          }
        }
        if (dataStartRow !== -1) break;
      }

      if (dataStartRow === -1) {
        throw new Error('"연번" 헤더를 찾을 수 없습니다.');
      }

      // 데이터 추출
      const rawData = [];
      for (let row = dataStartRow + 1; row <= range.e.r; row++) {
        const rowData = [];
        let hasData = false;

        for (let col = dataStartCol; col <= range.e.c; col++) {
          const cellAddress = window.XLSX.utils.encode_cell({r: row, c: col});
          const cell = worksheet[cellAddress];
          const value = cell ? (cell.v || '') : '';
          rowData.push(value);
          if (value !== '') hasData = true;
        }

        if (hasData && rowData[0] !== '') { // 연번이 있는 행만
          rawData.push(rowData);
        }
      }

      // 데이터 구조화
      const structuredData = rawData.map(row => ({
        연번: row[0],
        과목명: row[1],
        이름: row[2],
        성별: row[3],
        생년월일: row[4],
        수업일: parseInt(row[5]) || 0,
        출석일: parseInt(row[6]) || 0,
        출석률: parseFloat(row[7]) || 0,
        수료여부: row[8]
      })).filter(item => item.과목명 && item.이름);

      // 과목별 기본 수료율 설정 (70%)
      const subjects = [...new Set(structuredData.map(item => item.과목명))];
      const defaultRates = {};
      subjects.forEach(subject => {
        defaultRates[subject] = 0.7;
      });
      subjectCompletionRates = defaultRates;
      data = structuredData;
    } catch (err) {
      error = '파일 처리 중 오류가 발생했습니다: ' + err.message;
      console.error(err);
    } finally {
      loading = false;
    }
  }

  // 파일 선택 핸들러
  async function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      const uploadedFile = files[0];
      if (uploadedFile.name.endsWith('.xlsx') || uploadedFile.name.endsWith('.xls')) {
        await processFile(uploadedFile);
      } else {
        error = '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.';
      }
    }
  }

  // 드래그앤드롭 핸들러
  function handleDragOver(e) {
    e.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave(e) {
    e.preventDefault();
    isDragOver = false;
  }

  async function handleDrop(e) {
    e.preventDefault();
    isDragOver = false;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const uploadedFile = files[0];
      if (uploadedFile.name.endsWith('.xlsx') || uploadedFile.name.endsWith('.xls')) {
        await processFile(uploadedFile);
      } else {
        error = '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.';
      }
    }
  }

  // 드롭존 클릭 핸들러
  function handleDropZoneClick() {
    if (fileInputRef) {
      fileInputRef.click();
    }
  }

  // 나이 계산 함수
  function calculateAge(birthDate) {
    if (!birthDate) return 0;

    let dateStr = birthDate.toString();
    let year, month, day;

    if (dateStr.includes('.')) {
      [year, month, day] = dateStr.split('.').map(Number);
    } else if (dateStr.includes('-')) {
      [year, month, day] = dateStr.split('-').map(Number);
    } else {
      return 0;
    }

    const today = new Date();
    const birth = new Date(year, month - 1, day);
    let age = today.getFullYear() - birth.getFullYear();

    if (today.getMonth() < birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  // 연령대 분류 함수
  function getAgeGroup(age) {
    if (age <= 19) return '19세 이하';
    if (age < 30) return '20대';
    if (age < 40) return '30대';
    if (age < 50) return '40대';
    if (age < 60) return '50대';
    return '60대 이상';
  }

  // 분석 실행
  function analyzeData() {
    if (!data) return;

    // 1. 과목별 기본 분석
    const subjectStats = {};

    data.forEach(item => {
      if (!subjectStats[item.과목명]) {
        subjectStats[item.과목명] = {
          수강인원: 0,
          출석률합계: 0,
          수료인원: 0
        };
      }

      subjectStats[item.과목명].수강인원++;
      subjectStats[item.과목명].출석률합계 += item.출석률;

      const completionRate = subjectCompletionRates[item.과목명] || 0.7;
      if (item.출석률 >= completionRate) {
        subjectStats[item.과목명].수료인원++;
      }
    });

    const subjectResults = Object.entries(subjectStats).map(([과목명, stats]) => ({
      과목명,
      수강인원: stats.수강인원,
      평균출석률: (stats.출석률합계 / stats.수강인원),
      수료인원: stats.수료인원,
      수료율: stats.수료인원 / stats.수강인원
    }));

    // 2. 성별 분포
    const genderStats = { 여성: 0, 남성: 0 };
    data.forEach(item => {
      if (item.성별 === '여성' || item.성별 === '여') {
        genderStats.여성++;
      } else if (item.성별 === '남성' || item.성별 === '남') {
        genderStats.남성++;
      }
    });

    const totalStudents = genderStats.여성 + genderStats.남성;
    const genderDistribution = {
      여성: { 명수: genderStats.여성, 비율: (genderStats.여성 / totalStudents * 100) },
      남성: { 명수: genderStats.남성, 비율: (genderStats.남성 / totalStudents * 100) },
      합계: { 명수: totalStudents, 비율: 100 }
    };

    // 3. 수강생별 강좌 수 계산 (이름, 성별, 생년월일 조합으로 동일인 판단)
    const studentCourses = {};
    data.forEach(item => {
      const key = `${item.이름}_${item.성별}_${item.생년월일}`;
      if (!studentCourses[key]) {
        studentCourses[key] = {
          이름: item.이름,
          성별: item.성별,
          생년월일: item.생년월일,
          강좌수: 0,
          강좌목록: []
        };
      }
      studentCourses[key].강좌수++;
      studentCourses[key].강좌목록.push(item.과목명);
    });

    const courseCountStats = { 1: 0, 2: 0, '3이상': 0 };
    Object.values(studentCourses).forEach(student => {
      if (student.강좌수 === 1) {
        courseCountStats[1]++;
      } else if (student.강좌수 === 2) {
        courseCountStats[2]++;
      } else {
        courseCountStats['3이상']++;
      }
    });

    const uniqueStudents = Object.keys(studentCourses).length;
    const courseCountDistribution = {
      '1강좌': { 명수: courseCountStats[1], 비율: (courseCountStats[1] / uniqueStudents * 100) },
      '2강좌': { 명수: courseCountStats[2], 비율: (courseCountStats[2] / uniqueStudents * 100) },
      '3강좌 이상': { 명수: courseCountStats['3이상'], 비율: (courseCountStats['3이상'] / uniqueStudents * 100) }
    };

    // 4. 연령 분포 (강좌별로 집계)
    const ageStats = {
      '19세 이하': 0,
      '20대': 0,
      '30대': 0,
      '40대': 0,
      '50대': 0,
      '60대 이상': 0
    };

    data.forEach(item => {
      const age = calculateAge(item.생년월일);
      const ageGroup = getAgeGroup(age);
      ageStats[ageGroup]++;
    });

    const ageDistribution = {};
    Object.entries(ageStats).forEach(([ageGroup, count]) => {
      ageDistribution[ageGroup] = {
        명수: count,
        비율: (count / totalStudents * 100)
      };
    });

    analysis = {
      subjectResults,
      genderDistribution,
      courseCountDistribution,
      ageDistribution,
      totalStudents,
      uniqueStudents
    };
  }

  // 엑셀 다운로드
  function downloadExcel() {
    if (!analysis) return;

    const wb = window.XLSX.utils.book_new();

    // 과목별 결과 시트
    const subjectData = analysis.subjectResults.map(item => ({
      '과목명': item.과목명,
      '수강인원': item.수강인원,
      '평균출석률': Math.round(item.평균출석률 * 1000) / 10, // 소수점 1자리 %
      '수료인원': item.수료인원,
      '수료율': Math.round(item.수료율 * 1000) / 10 // 소수점 1자리 %
    }));

    const ws = window.XLSX.utils.json_to_sheet(subjectData);
    window.XLSX.utils.book_append_sheet(wb, ws, '과목별 분석결과');

    // 파일 다운로드
    window.XLSX.writeFile(wb, `강좌분석결과_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  // 과목별 수료율 변경 핸들러
  function handleCompletionRateChange(subject, rate) {
    subjectCompletionRates = {
      ...subjectCompletionRates,
      [subject]: rate
    };
  }

  // 수료 기준 변경 시 재분석
  $: if (data && Object.keys(subjectCompletionRates).length > 0) {
    analyzeData();
  }
</script>

<div class="min-h-screen bg-gray-50 p-6">
  <div class="max-w-6xl mx-auto">
    <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div class="flex items-center gap-3 mb-6">
        <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"></path>
        </svg>
        <h1 class="text-3xl font-bold text-gray-800">수강정보분석기</h1>
      </div>

      <!-- 숨겨진 파일 입력 -->
      <input
        bind:this={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        on:change={handleFileSelect}
        class="hidden"
      />

      <!-- 드래그앤드롭 영역 -->
      {#if !data}
        <div
          bind:this={dropZoneRef}
          on:dragover={handleDragOver}
          on:dragleave={handleDragLeave}
          on:drop={handleDrop}
          on:click={handleDropZoneClick}
          class="border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer {
            isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }"
        >
          <div class="space-y-4">
            <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center {
              isDragOver ? 'bg-blue-100' : 'bg-gray-200'
            }">
              <svg class="w-8 h-8 {
                isDragOver ? 'text-blue-600' : 'text-gray-500'
              }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-semibold text-gray-800 mb-2">
                엑셀 파일을 드래그하거나 클릭하세요
              </h3>
              <p class="text-gray-600">
                "개인별 출석현황" 시트가 포함된 .xlsx 또는 .xls 파일을 업로드하면 자동으로 분석이 시작됩니다.
              </p>
            </div>
          </div>
        </div>
      {/if}

      {#if loading}
        <div class="flex items-center gap-2 text-blue-600 mb-4">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          파일을 처리하는 중...
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
            on:click={() => showModal = true}
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
            on:click={downloadExcel}
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
              {analysis.subjectResults.reduce((sum, item) => sum + item.수료인원, 0)}
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
              on:click={() => showModal = false}
              class="p-2 hover:bg-gray-100 rounded-full transition-colors"
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
                      on:change={(e) => handleCompletionRateChange(subject, parseInt(e.target.value) / 100)}
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
              on:click={() => showModal = false}
              class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              닫기
            </button>
            <button
              on:click={() => showModal = false}
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
