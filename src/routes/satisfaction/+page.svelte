<script>
	// Icons as simple SVG strings
	const icons = {
		upload: `<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>`,
		download: `<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>`,
		fileText: `<svg class="h-5 w-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
		barChart: `<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
		users: `<svg class="h-8 w-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/></svg>`,
		trendingUp: `<svg class="mr-2 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>`,
	};

	let file = null;
	let analyzing = false;
	let results = null;
	let downloadUrl = null;

	// 지역 분류 매핑
	const regionMapping = {
		통진읍: "통진읍",
		고촌읍: "고촌읍",
		양촌읍: "양촌읍",
		월곶면: "월곶면",
		하성면: "하성면",
		대곶면: "대곶면",
		김포본동: "김포본동",
		장기본동: "장기본동",
		사우동: "사우동",
		풍무동: "풍무동",
		장기동: "장기동",
		구래동: "구래동",
		마산동: "마산동",
		운양동: "운양동",
	};

	// 만족도 점수 매핑
	const satisfactionScoreMapping = {
		"매우 그렇다": 5,
		그렇다: 4,
		보통: 3,
		"그렇지 않다": 2,
		"매우 그렇지 않다": 1,
	};

	// 파일 업로드 처리
	function handleFileUpload(event) {
		const uploadedFile = event.target.files[0];
		if (uploadedFile) {
			if (!uploadedFile.name.toLowerCase().endsWith(".xlsx")) {
				alert("Excel 파일(.xlsx)만 업로드 가능합니다.");
				return;
			}
			file = uploadedFile;
			results = null;
			downloadUrl = null;
		}
	}

	// 드래그 앤 드롭 처리
	function handleDragEnter(e) {
		e.preventDefault();
		e.currentTarget.classList.add("border-indigo-500", "bg-indigo-50");
	}

	function handleDragOver(e) {
		e.preventDefault();
		e.currentTarget.classList.add("border-indigo-500", "bg-indigo-50");
	}

	function handleDragLeave(e) {
		e.preventDefault();
		if (!e.currentTarget.contains(e.relatedTarget)) {
			e.currentTarget.classList.remove(
				"border-indigo-500",
				"bg-indigo-50",
			);
		}
	}

	function handleDrop(e) {
		e.preventDefault();
		e.currentTarget.classList.remove("border-indigo-500", "bg-indigo-50");
		const files = Array.from(e.dataTransfer.files);
		const excelFile = files.find((f) =>
			f.name.toLowerCase().endsWith(".xlsx"),
		);
		if (excelFile) {
			file = excelFile;
			results = null;
			downloadUrl = null;
		} else {
			alert("Excel 파일(.xlsx)만 업로드 가능합니다.");
		}
	}

	// 텍스트 정규화 함수
	function normalizeText(text, category) {
		if (!text) return "";

		const cleanText = text
			.toString()
			.toLowerCase()
			.replace(/\s+/g, "")
			.replace(/[.,!?]/g, "");

		switch (category) {
			case "gender":
				if (cleanText.includes("남") || cleanText.includes("male"))
					return "남성";
				if (cleanText.includes("여") || cleanText.includes("female"))
					return "여성";
				break;

			case "region":
				const regions = [
					"통진읍",
					"고촌읍",
					"양촌읍",
					"월곶면",
					"하성면",
					"대곶면",
					"김포본동",
					"장기본동",
					"사우동",
					"풍무동",
					"장기동",
					"구래동",
					"마산동",
					"운양동",
				];
				for (const region of regions) {
					if (cleanText.includes(region.replace(/\s+/g, "")))
						return region;
				}
				return "기타지역";

			case "age":
				if (
					cleanText.includes("19") ||
					cleanText.includes("10대") ||
					cleanText.includes("미성년")
				)
					return "19세 이하";
				if (cleanText.includes("20")) return "20대";
				if (cleanText.includes("30")) return "30대";
				if (cleanText.includes("40")) return "40대";
				if (cleanText.includes("50")) return "50대";
				if (cleanText.includes("60")) return "60대";
				if (
					cleanText.includes("70") ||
					cleanText.includes("80") ||
					cleanText.includes("90")
				)
					return "70대이상";
				break;

			case "job":
				if (
					cleanText.includes("직장") ||
					cleanText.includes("회사") ||
					cleanText.includes("사무")
				)
					return "직장인";
				if (cleanText.includes("자영")) return "자영업";
				if (
					cleanText.includes("농업") ||
					cleanText.includes("어업") ||
					cleanText.includes("축산") ||
					cleanText.includes("임업")
				)
					return "농어업축산임업";
				if (cleanText.includes("주부") || cleanText.includes("가정"))
					return "주부";
				if (cleanText.includes("학생") || cleanText.includes("대학"))
					return "학생";
				return "기타";

			case "satisfaction":
				if (
					cleanText.includes("매우") &&
					cleanText.includes("그렇다")
				) {
					return "매우 그렇다";
				}
				if (
					cleanText.includes("매우") &&
					(cleanText.includes("그렇지않다") ||
						cleanText.includes("안다") ||
						cleanText.includes("않다"))
				) {
					return "매우 그렇지 않다";
				}
				if (
					cleanText.includes("그렇지않다") ||
					(cleanText.includes("그렇지") && cleanText.includes("않다"))
				) {
					return "그렇지 않다";
				}
				if (cleanText.includes("그렇다")) {
					return "그렇다";
				}
				if (cleanText.includes("보통")) {
					return "보통";
				}

				if (cleanText === "5") return "매우 그렇다";
				if (cleanText === "4") return "그렇다";
				if (cleanText === "3") return "보통";
				if (cleanText === "2") return "그렇지 않다";
				if (cleanText === "1") return "매우 그렇지 않다";

				break;
		}

		return text;
	}

	// 데이터 분석 및 집계
	async function analyzeData() {
		if (!file) return;

		analyzing = true;

		try {
			const arrayBuffer = await file.arrayBuffer();
			const workbook = window.XLSX.read(arrayBuffer, { type: "array" });

			const dataSheetName = workbook.SheetNames.find((name) =>
				name.includes("원본데이터"),
			);
			if (!dataSheetName) {
				alert("원본데이터 시트를 찾을 수 없습니다.");
				return;
			}

			const worksheet = workbook.Sheets[dataSheetName];
			const rawData = window.XLSX.utils.sheet_to_json(worksheet, {
				header: 1,
			});

			let headerRowIndex = -1;
			for (let i = 0; i < Math.min(20, rawData.length); i++) {
				if (
					rawData[i] &&
					rawData[i].some(
						(cell) => cell && cell.toString().includes("연번"),
					)
				) {
					headerRowIndex = i;
					break;
				}
			}

			if (headerRowIndex === -1) {
				alert("데이터 테이블을 찾을 수 없습니다.");
				return;
			}

			const headers = rawData[headerRowIndex];
			const dataRows = rawData
				.slice(headerRowIndex + 1)
				.filter((row) => row && row[0]);

			const columnIndexes = {
				serialNumber: 0,
				subject: 1,
				startDate: 2,
				endDate: 3,
				gender: 4,
				region: 5,
				age: 6,
				job: 7,
			};

			// 만족도 문항 컬럼 인덱스 찾기
			const satisfactionColumnIndexes = [];
			const questionPatterns = [
				"2-1.*적극",
				"2-2.*전문",
				"2-3.*충실",
				"2-4.*시간",
				"2-5.*활용",
				"2-6.*유익",
				"2-7.*교재",
				"2-8.*시설",
				"2-9.*만족",
			];

			questionPatterns.forEach((pattern) => {
				const regex = new RegExp(pattern, "i");
				const columnIndex = headers.findIndex(
					(header) => header && regex.test(header.toString()),
				);
				satisfactionColumnIndexes.push(columnIndex);
			});

			const satisfactionQuestions = [
				"강사 적극성",
				"강사 전문성",
				"내용 충실성",
				"시간대 적정성",
				"수업의 활용도",
				"수업 유익성",
				"교재 및 자료 충분성",
				"강의 시설 만족도",
				"체감 만족도",
			];

			// 과목명 병합 셀 처리
			const subjectGroups = {};
			let currentSubject = null;

			for (let i = 0; i < dataRows.length; i++) {
				const row = dataRows[i];
				let subject = row[columnIndexes.subject];

				if (!subject || subject.toString().trim() === "") {
					if (currentSubject) {
						subject = currentSubject;
						row[columnIndexes.subject] = currentSubject;
					} else {
						for (let j = i - 1; j >= 0; j--) {
							const prevSubject =
								dataRows[j][columnIndexes.subject];
							if (
								prevSubject &&
								prevSubject.toString().trim() !== ""
							) {
								subject = prevSubject.toString().trim();
								currentSubject = subject;
								row[columnIndexes.subject] = subject;
								break;
							}
						}
					}
				} else {
					subject = subject.toString().trim();
					currentSubject = subject;
				}

				if (!subject) continue;

				if (!subjectGroups[subject]) {
					subjectGroups[subject] = [];
				}
				subjectGroups[subject].push(row);
			}

			// 응답자 특성 정리
			const respondentCharacteristics = {};

			for (const [subject, rows] of Object.entries(subjectGroups)) {
				respondentCharacteristics[subject] = {
					subject,
					gender: { 남성: 0, 여성: 0 },
					region: Object.keys(regionMapping).reduce(
						(acc, region) => ({ ...acc, [region]: 0 }),
						{ 기타지역: 0 },
					),
					age: {
						"19세 이하": 0,
						"20대": 0,
						"30대": 0,
						"40대": 0,
						"50대": 0,
						"60대": 0,
						"70대이상": 0,
					},
					job: {
						직장인: 0,
						자영업: 0,
						농어업축산임업: 0,
						주부: 0,
						학생: 0,
						기타: 0,
					},
				};

				for (const row of rows) {
					// 성별 집계
					const genderText = row[columnIndexes.gender];
					if (genderText) {
						const normalizedGender = normalizeText(
							genderText,
							"gender",
						);
						if (normalizedGender === "남성") {
							respondentCharacteristics[subject].gender.남성++;
						} else if (normalizedGender === "여성") {
							respondentCharacteristics[subject].gender.여성++;
						}
					}

					// 지역 집계
					const regionText = row[columnIndexes.region];
					if (regionText) {
						const normalizedRegion = normalizeText(
							regionText,
							"region",
						);
						if (
							respondentCharacteristics[
								subject
							].region.hasOwnProperty(normalizedRegion)
						) {
							respondentCharacteristics[subject].region[
								normalizedRegion
							]++;
						} else {
							respondentCharacteristics[subject].region
								.기타지역++;
						}
					}

					// 연령 집계
					const ageText = row[columnIndexes.age];
					if (ageText) {
						const normalizedAge = normalizeText(ageText, "age");
						if (
							respondentCharacteristics[
								subject
							].age.hasOwnProperty(normalizedAge)
						) {
							respondentCharacteristics[subject].age[
								normalizedAge
							]++;
						}
					}

					// 직업 집계
					const jobText = row[columnIndexes.job];
					if (jobText) {
						const normalizedJob = normalizeText(jobText, "job");
						if (
							respondentCharacteristics[
								subject
							].job.hasOwnProperty(normalizedJob)
						) {
							respondentCharacteristics[subject].job[
								normalizedJob
							]++;
						}
					}
				}
			}

			// 객관식 응답 집계
			const satisfactionDistribution = {};
			const satisfactionAverages = {};

			for (const [subject, rows] of Object.entries(subjectGroups)) {
				satisfactionDistribution[subject] = {
					subject,
					questions: {},
				};
				satisfactionAverages[subject] = {
					subject,
					scores: {},
				};

				for (let i = 0; i < satisfactionQuestions.length; i++) {
					const questionName = satisfactionQuestions[i];
					const columnIndex = satisfactionColumnIndexes[i];

					if (columnIndex === -1) {
						continue;
					}

					satisfactionDistribution[subject].questions[questionName] =
						{
							"매우 그렇다": 0,
							그렇다: 0,
							보통: 0,
							"그렇지 않다": 0,
							"매우 그렇지 않다": 0,
						};

					let totalScore = 0;
					let validResponses = 0;

					for (const row of rows) {
						const responseText = row[columnIndex];
						if (responseText) {
							const normalizedResponse = normalizeText(
								responseText,
								"satisfaction",
							);

							if (
								satisfactionScoreMapping.hasOwnProperty(
									normalizedResponse,
								)
							) {
								satisfactionDistribution[subject].questions[
									questionName
								][normalizedResponse]++;
								totalScore +=
									satisfactionScoreMapping[
										normalizedResponse
									];
								validResponses++;
							}
						}
					}

					satisfactionAverages[subject].scores[questionName] =
						validResponses > 0
							? (totalScore / validResponses).toFixed(2)
							: 0;
				}

				const questionScores = Object.values(
					satisfactionAverages[subject].scores,
				).map(Number);
				satisfactionAverages[subject].scores["전체"] =
					questionScores.length > 0
						? (
								questionScores.reduce((a, b) => a + b, 0) /
								questionScores.length
							).toFixed(2)
						: 0;
			}

			const analysisResults = {
				respondentCharacteristics,
				satisfactionDistribution,
				satisfactionAverages,
				totalSubjects: Object.keys(subjectGroups).length,
				totalResponses: dataRows.length,
			};

			results = analysisResults;

			// Excel 파일 생성
			await generateExcelFile(analysisResults);
		} catch (error) {
			console.error("분석 오류:", error);
			alert("파일 분석 중 오류가 발생했습니다.");
		} finally {
			analyzing = false;
		}
	}

	// Excel 결과 파일 생성
	async function generateExcelFile(analysisResults) {
		try {
			const workbook = window.XLSX.utils.book_new();

			// 응답자 특성 시트
			const respondentData = [];
			const respondentHeaders = [
				"교육과목",
				"성별-남",
				"성별-여",
				"성별-합계",
				"통진읍",
				"고촌읍",
				"양촌읍",
				"월곶면",
				"하성면",
				"대곶면",
				"김포본동",
				"장기본동",
				"사우동",
				"풍무동",
				"장기동",
				"구래동",
				"마산동",
				"운양동",
				"기타지역",
				"지역-합계",
				"19세 이하",
				"20대",
				"30대",
				"40대",
				"50대",
				"60대",
				"70대이상",
				"연령-합계",
				"직장인",
				"자영업",
				"농어업축산임업",
				"주부",
				"학생",
				"기타",
				"직업-합계",
			];
			respondentData.push(respondentHeaders);

			Object.values(analysisResults.respondentCharacteristics).forEach(
				(data) => {
					const row = [data.subject];

					row.push(data.gender.남성, data.gender.여성);
					row.push(data.gender.남성 + data.gender.여성);

					Object.keys(regionMapping).forEach((region) => {
						row.push(data.region[region] || 0);
					});
					row.push(data.region.기타지역);
					const regionTotal = Object.values(data.region).reduce(
						(a, b) => a + b,
						0,
					);
					row.push(regionTotal);

					Object.keys(data.age).forEach((age) => {
						row.push(data.age[age]);
					});
					const ageTotal = Object.values(data.age).reduce(
						(a, b) => a + b,
						0,
					);
					row.push(ageTotal);

					Object.keys(data.job).forEach((job) => {
						row.push(data.job[job]);
					});
					const jobTotal = Object.values(data.job).reduce(
						(a, b) => a + b,
						0,
					);
					row.push(jobTotal);

					respondentData.push(row);
				},
			);

			const respondentSheet =
				window.XLSX.utils.aoa_to_sheet(respondentData);
			window.XLSX.utils.book_append_sheet(
				workbook,
				respondentSheet,
				"응답자 특성",
			);

			// 객관식 응답 집계 시트
			const distributionData = [];
			const distributionHeaders = ["과목명"];

			const satisfactionQuestions = [
				"강사 적극성",
				"강사 전문성",
				"내용 충실성",
				"시간대 적정성",
				"수업의 활용도",
				"수업 유익성",
				"교재 및 자료 충분성",
				"강의 시설 만족도",
				"체감 만족도",
			];

			satisfactionQuestions.forEach((question) => {
				distributionHeaders.push(
					`${question}-매우그렇다`,
					`${question}-그렇다`,
					`${question}-보통`,
					`${question}-그렇지않다`,
					`${question}-매우그렇지않다`,
					`${question}-합계`,
				);
			});

			distributionData.push(distributionHeaders);

			Object.values(analysisResults.satisfactionDistribution).forEach(
				(data) => {
					const row = [data.subject];

					satisfactionQuestions.forEach((question) => {
						const questionData = data.questions[question];
						if (questionData) {
							const values = [
								questionData["매우 그렇다"],
								questionData["그렇다"],
								questionData["보통"],
								questionData["그렇지 않다"],
								questionData["매우 그렇지 않다"],
							];
							row.push(...values);
							row.push(values.reduce((a, b) => a + b, 0));
						} else {
							row.push(0, 0, 0, 0, 0, 0);
						}
					});

					distributionData.push(row);
				},
			);

			const distributionSheet =
				window.XLSX.utils.aoa_to_sheet(distributionData);
			window.XLSX.utils.book_append_sheet(
				workbook,
				distributionSheet,
				"객관식 응답 집계",
			);

			// 평균만족도 시트
			const averageData = [];
			const averageHeaders = ["과목명", "전체", ...satisfactionQuestions];
			averageData.push(averageHeaders);

			Object.values(analysisResults.satisfactionAverages).forEach(
				(data) => {
					const row = [data.subject, data.scores["전체"]];
					satisfactionQuestions.forEach((question) => {
						row.push(data.scores[question] || 0);
					});
					averageData.push(row);
				},
			);

			const averageSheet = window.XLSX.utils.aoa_to_sheet(averageData);
			window.XLSX.utils.book_append_sheet(
				workbook,
				averageSheet,
				"평균만족도",
			);

			// Excel 파일 생성
			const excelBuffer = window.XLSX.write(workbook, {
				bookType: "xlsx",
				type: "array",
			});
			const blob = new Blob([excelBuffer], {
				type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			});
			const url = URL.createObjectURL(blob);
			downloadUrl = url;
		} catch (error) {
			console.error("Excel 생성 오류:", error);
			alert("Excel 파일 생성 중 오류가 발생했습니다.");
		}
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

<svelte:head>
	<script
		src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
	></script>
</svelte:head>

<div
	class="max-w-6xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen"
>
	<div class="bg-white rounded-xl shadow-lg p-8">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-gray-800 mb-2">
				평생교육 수업만족도 분석
			</h1>
			<p class="text-gray-600">
				Excel 파일을 업로드하여 자동으로 만족도를 분석하고 결과를
				다운로드하세요
			</p>
		</div>

		<!-- 파일 업로드 영역 -->
		<div class="mb-8">
			<div
				class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors"
				on:dragenter={handleDragEnter}
				on:dragover={handleDragOver}
				on:dragleave={handleDragLeave}
				on:drop={handleDrop}
				role="button"
				tabindex="0"
			>
				{@html icons.upload}
				<label for="file-upload" class="cursor-pointer">
					<span class="text-lg font-medium text-gray-700"
						>Excel 파일을 선택하거나 드래그하세요</span
					>
					<input
						id="file-upload"
						type="file"
						class="hidden"
						accept=".xlsx"
						on:change={handleFileUpload}
					/>
				</label>
				<p class="text-sm text-gray-500 mt-2">지원 형식: .xlsx</p>

				{#if file}
					<div class="mt-4 p-3 bg-gray-50 rounded-lg">
						<div class="flex items-center justify-center">
							{@html icons.fileText}
							<span class="text-sm font-medium text-gray-700"
								>{file.name}</span
							>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- 분석 버튼 -->
		{#if file && !analyzing}
			<div class="text-center mb-8">
				<button
					on:click={analyzeData}
					class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg transition-colors flex items-center mx-auto"
				>
					{@html icons.barChart}
					분석 시작
				</button>
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
					on:click={handleDownload}
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
