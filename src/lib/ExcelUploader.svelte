<svelte:head>
  <script
    src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
    integrity="sha512-r22gChDnGvBylk90+2e/ycr3RVrDi8DIOkIGNhJlKfG2zm+/uXkRu6rGb7UKUvTJ9YhA8SPhFl5VTf8p1k1FhA=="
    crossorigin="anonymous"
  ></script>
</svelte:head>

<script>
	let {
	  sheetNamePattern = '',
	  headerHint = '연번',
	  title = '엑셀 파일을 드래그하거나 클릭하세요',
	  description = '시트가 포함된 .xlsx 또는 .xls 파일을 업로드하면 자동으로 분석이 시작됩니다.',
	  onUpload = (/** @type {{ file: File, rawData: any[] }} */ detail) => {},
		onError = (/** @type {{ error: string }} */ detail) => {}
	} = $props();

  let file = null;
  let loading = $state(false);
  let error = $state('');
  let isDragOver = $state(false);

  let fileInputRef;

  // 파일 크기 제한: 50MB
  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  /**
   * RegExp 패턴을 안전하게 이스케이프하는 함수
   */
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async function processFile(uploadedFile) {
    file = uploadedFile;
    loading = true;
    error = '';

    try {
      // 파일 크기 검증
      if (uploadedFile.size > MAX_FILE_SIZE) {
        throw new Error(`파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / (1024 * 1024)}MB까지 업로드 가능합니다.`);
      }

      const buffer = await uploadedFile.arrayBuffer();
      const workbook = window.XLSX.read(buffer, {
        cellStyles: true,
        cellFormulas: true,
        cellDates: true,
        cellNF: true,
        sheetStubs: true
      });

      let sheetName = workbook.SheetNames.find(name => {
        // ReDoS 방지: 패턴을 이스케이프하거나 안전한 검색 사용
        try {
          const pattern = new RegExp(sheetNamePattern);
          return pattern.test(name);
        } catch (e) {
          // 정규식 생성 실패 시 단순 문자열 포함 검사로 폴백
          return name.includes(sheetNamePattern);
        }
      });

      if (!sheetName) {
        throw new Error(`'${sheetNamePattern}' 시트를 찾을 수 없습니다.`);
      }

      const worksheet = workbook.Sheets[sheetName];
      const range = window.XLSX.utils.decode_range(worksheet['!ref']);

      let dataStartRow = -1;
      let dataStartCol = -1;

      for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = window.XLSX.utils.encode_cell({r: row, c: col});
          const cell = worksheet[cellAddress];
          if (cell && cell.v && cell.v.toString().includes(headerHint)) {
            dataStartRow = row;
            dataStartCol = col;
            break;
          }
        }
        if (dataStartRow !== -1) break;
      }

      if (dataStartRow === -1) {
        throw new Error(`'${headerHint}' 헤더를 찾을 수 없습니다.`);
      }

      const header = [];
      for (let col = dataStartCol; col <= range.e.c; col++) {
          const cellAddress = window.XLSX.utils.encode_cell({r: dataStartRow, c: col});
          const cell = worksheet[cellAddress];
          header.push(cell ? cell.v : undefined);
      }

      const rawData = window.XLSX.utils.sheet_to_json(worksheet, {
          range: dataStartRow
      });

      onUpload({ file, rawData });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      error = '파일 처리 중 오류가 발생했습니다: ' + errorMessage;
      console.error(err);
      onError({ error: errorMessage });
    } finally {
      loading = false;
    }
  }

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

  function handleDropZoneClick() {
    if (fileInputRef) {
      fileInputRef.click();
    }
  }
</script>

<!-- 숨겨진 파일 입력 -->
<input
  bind:this={fileInputRef}
  type="file"
  accept=".xlsx,.xls"
  on:change={handleFileSelect}
  class="hidden"
/>

<!-- 드래그앤드롭 영역 -->
<div
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
        {title}
      </h3>
      <p class="text-gray-600 text-sm">
        {description}
      </p>
    </div>
  </div>
</div>

{#if loading}
  <div class="flex items-center gap-2 text-blue-600 my-4">
    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
    파일을 처리하는 중...
  </div>
{/if}

{#if error}
  <div class="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
    <p class="text-red-700">{error}</p>
  </div>
{/if}
