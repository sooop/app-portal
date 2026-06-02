// Mappings and Constants
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

const satisfactionScoreMapping = {
    "매우 그렇다": 5,
    그렇다: 4,
    보통: 3,
    "그렇지 않다": 2,
    "매우 그렇지 않다": 1,
};

// Helper function (not exported)
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
            const regions = Object.keys(regionMapping);
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
            if (
                cleanText.includes("60") ||
                cleanText.includes("70") ||
                cleanText.includes("80") ||
                cleanText.includes("90")
            )
                return "60대 이상";
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

// 상수 정의
const MAX_ROWS = 100000;

/**
 * 만족도 데이터를 분석하여 결과 객체를 반환합니다. (Excel 생성 없음)
 * @param {Array<Object>} rawData - 원본데이터 시트에서 추출한 행 배열
 * @returns {Object} 분석 결과 객체
 */
export function analyzeSatisfactionData(rawData) {
    if (!rawData || rawData.length === 0) {
        throw new Error("분석할 데이터가 없습니다.");
    }

    if (rawData.length > MAX_ROWS) {
        throw new Error(`데이터가 너무 큽니다. 최대 ${MAX_ROWS.toLocaleString()}행까지 분석 가능합니다.`);
    }

    const headers = Object.keys(rawData[0]);
    const dataRows = rawData;

    // 열 인덱스 동적 탐지
    const columnIndexes = {
        serialNumber: headers.findIndex(h => h.includes('연번')),
        subject: headers.findIndex(h => h.includes('과목명')),
        gender: headers.findIndex(h => /성별/i.test(h)),
        region: headers.findIndex(h => /지역|거주|주소/i.test(h)),
        age: headers.findIndex(h => /연령|나이/i.test(h)),
        job: headers.findIndex(h => /직업|직종/i.test(h)),
    };

    if (columnIndexes.gender === -1) columnIndexes.gender = 4;
    if (columnIndexes.region === -1) columnIndexes.region = 5;
    if (columnIndexes.age === -1) columnIndexes.age = 6;
    if (columnIndexes.job === -1) columnIndexes.job = 7;

    const questionPatterns = ["2-1.*적극", "2-2.*전문", "2-3.*충실", "2-4.*시간", "2-5.*활용", "2-6.*유익", "2-7.*교재", "2-8.*(시설|시섦|교육지원)", "2-9.*만족"];
    const satisfactionColumnIndexes = questionPatterns.map(pattern => {
        const regex = new RegExp(pattern, "i");
        return headers.findIndex(header => header && regex.test(header.toString()));
    });
    const satisfactionQuestions = ["강사 적극성", "강사 전문성", "내용 충실성", "시간대 적정성", "수업의 활용도", "수업 유익성", "교재 및 자료 충분성", "강의 시설 만족도", "체감 만족도"];

    const subjectGroups = {};
    let currentSubject = null;
    dataRows.forEach(row => {
        let subject = row[headers[columnIndexes.subject]];
        if (subject && subject.toString().trim() !== "") {
            currentSubject = subject.toString().trim();
        } else if (currentSubject) {
            subject = currentSubject;
        }
        if (!subject) return;

        if (!subjectGroups[subject]) subjectGroups[subject] = [];
        subjectGroups[subject].push(row);
    });

    const respondentCharacteristics = {};
    const satisfactionDistribution = {};
    const satisfactionAverages = {};

    for (const [subject, rows] of Object.entries(subjectGroups)) {
        respondentCharacteristics[subject] = {
            subject,
            gender: { 남성: 0, 여성: 0 },
            region: Object.fromEntries(Object.keys(regionMapping).map(k => [k, 0])),
            age: { "19세 이하": 0, "20대": 0, "30대": 0, "40대": 0, "50대": 0, "60대 이상": 0 },
            job: { "직장인": 0, "자영업": 0, "농어업축산임업": 0, "주부": 0, "학생": 0, "기타": 0 }
        };
        respondentCharacteristics[subject].region['기타지역'] = 0;
        satisfactionDistribution[subject] = { subject, questions: {} };
        satisfactionAverages[subject] = { subject, scores: {} };

        rows.forEach(row => {
            const gender = normalizeText(row[headers[columnIndexes.gender]], "gender");
            if (gender) respondentCharacteristics[subject].gender[gender]++;

            const region = normalizeText(row[headers[columnIndexes.region]], "region");
            if (region) respondentCharacteristics[subject].region[region]++;

            const age = normalizeText(row[headers[columnIndexes.age]], "age");
            if (age) respondentCharacteristics[subject].age[age]++;

            const job = normalizeText(row[headers[columnIndexes.job]], "job");
            if (job) respondentCharacteristics[subject].job[job]++;
        });

        satisfactionQuestions.forEach((questionName, i) => {
            const columnIndex = satisfactionColumnIndexes[i];
            if (columnIndex === -1) return;

            const questionResponses = { "매우 그렇다": 0, 그렇다: 0, 보통: 0, "그렇지 않다": 0, "매우 그렇지 않다": 0 };
            let totalScore = 0, validResponses = 0;

            rows.forEach(row => {
                const responseText = row[headers[columnIndex]];
                if (responseText) {
                    const normalizedResponse = normalizeText(responseText, "satisfaction");
                    if (satisfactionScoreMapping[normalizedResponse]) {
                        questionResponses[normalizedResponse]++;
                        totalScore += satisfactionScoreMapping[normalizedResponse];
                        validResponses++;
                    }
                }
            });

            satisfactionDistribution[subject].questions[questionName] = questionResponses;
            satisfactionAverages[subject].scores[questionName] = validResponses > 0 ? (totalScore / validResponses).toFixed(2) : 0;
        });

        const questionScores = Object.values(satisfactionAverages[subject].scores).map(Number);
        satisfactionAverages[subject].scores["전체"] = questionScores.length > 0
            ? (questionScores.reduce((a, b) => a + b, 0) / questionScores.length).toFixed(2)
            : 0;
    }

    return {
        respondentCharacteristics,
        satisfactionDistribution,
        satisfactionAverages,
        totalSubjects: Object.keys(subjectGroups).length,
        totalResponses: dataRows.length,
    };
}

/**
 * 출석+만족도 통합 Excel 파일을 생성하고 Blob URL을 반환합니다.
 * Sheet 1: 수강생 정보 분석 (출석)
 * Sheet 2: 응답자 특성 (만족도)
 * Sheet 3: 객관식 응답 집계 (만족도)
 * Sheet 4: 평균만족도 (만족도)
 * @param {any} satisfactionResults - analyzeSatisfactionData의 반환값
 * @param {any} ExcelJS - ExcelJS 라이브러리 객체
 * @param {Record<string,any> | null} [attendanceResults] - analyzeData의 반환값
 * @returns {Promise<string | null>} Blob URL (사용 후 revokeObjectURL 필요)
 */
export async function generateCombinedExcel(satisfactionResults, ExcelJS, attendanceResults = null) {
    if (!satisfactionResults || !ExcelJS) return null;

    const workbook = new ExcelJS.Workbook();

    // ── Sheet 1: 수강생 정보 분석 ──────────────────────────────────────────
    if (attendanceResults) {
        const sheet = workbook.addWorksheet("수강생 정보 분석");
        const ar = /** @type {any} */ (attendanceResults);

        /** @param {string} label */
        const addSection = (label) => {
            const row = sheet.addRow([label]);
            row.font = { bold: true };
        };
        /** @param {(string|number)[]} cols */
        const addHeader = (cols) => {
            const row = sheet.addRow(cols);
            row.font = { bold: true };
        };

        // 과목별 분석결과
        addSection("과목별 분석결과");
        addHeader(["과목명", "수강인원", "평균출석률(%)", "수료인원", "수료율(%)"]);
        ar.subjectResults.forEach(/** @param {any} item */ item => {
            sheet.addRow([
                item.과목명,
                item.수강인원,
                Number((item.평균출석률 * 100).toFixed(1)),
                item.수료인원,
                Number((item.수료율 * 100).toFixed(1)),
            ]);
        });

        sheet.addRow([]);

        // 성별 분포
        addSection("성별 분포");
        addHeader(["성별", "명수", "비율(%)"]);
        Object.entries(ar.genderDistribution).forEach(([gender, stats]) => {
            const s = /** @type {any} */ (stats);
            sheet.addRow([gender, s.명수, Number(s.비율.toFixed(1))]);
        });

        sheet.addRow([]);

        // 수강 강좌수별 분포
        addSection("수강 강좌수별 분포");
        addHeader(["수강강좌수", "명수", "비율(%)"]);
        Object.entries(ar.courseCountDistribution).forEach(([count, stats]) => {
            const s = /** @type {any} */ (stats);
            sheet.addRow([count, s.명수, Number(s.비율.toFixed(1))]);
        });
        sheet.addRow([`총 고유 수강생: ${ar.uniqueStudents}명`]);

        sheet.addRow([]);

        // 연령대별 분포
        addSection("연령대별 분포");
        addHeader(["연령대", "명수", "비율(%)"]);
        Object.entries(ar.ageDistribution).forEach(([ageGroup, stats]) => {
            const s = /** @type {any} */ (stats);
            sheet.addRow([ageGroup, s.명수, Number(s.비율.toFixed(1))]);
        });
        sheet.addRow(["(강좌별 집계, 동일인 중복 포함)"]);

        sheet.getColumn(1).width = 30;
        sheet.getColumn(2).width = 12;
        sheet.getColumn(3).width = 14;
        sheet.getColumn(4).width = 12;
        sheet.getColumn(5).width = 12;
    }

    // ── Sheet 2: 응답자 특성 ──────────────────────────────────────────────
    const respondentSheet = workbook.addWorksheet("응답자 특성");
    const respondentHeaders = [
        "교육과목", "성별-남", "성별-여", "성별-합계",
        ...Object.keys(regionMapping), "기타지역", "지역-합계",
        "19세 이하", "20대", "30대", "40대", "50대", "60대 이상", "연령-합계",
        "직장인", "자영업", "농어업축산임업", "주부", "학생", "기타", "직업-합계",
    ];
    respondentSheet.addRow(respondentHeaders);

    Object.values(satisfactionResults.respondentCharacteristics).forEach(data => {
        const d = /** @type {any} */ (data);
        const subjectName = typeof d.subject === 'object' ? String(d.subject) : d.subject;
        const row = [subjectName];
        row.push(d.gender.남성, d.gender.여성, d.gender.남성 + d.gender.여성);
        Object.keys(regionMapping).forEach(region => row.push(d.region[region] || 0));
        row.push(d.region.기타지역);
        row.push(Object.values(d.region).reduce((/** @type {number} */ a, /** @type {any} */ b) => a + b, 0));
        Object.keys(d.age).forEach(age => row.push(d.age[age]));
        row.push(Object.values(d.age).reduce((/** @type {number} */ a, /** @type {any} */ b) => a + b, 0));
        Object.keys(d.job).forEach(job => row.push(d.job[job]));
        row.push(Object.values(d.job).reduce((/** @type {number} */ a, /** @type {any} */ b) => a + b, 0));
        respondentSheet.addRow(row);
    });

    const satisfactionSubjects = Object.keys(satisfactionResults.satisfactionAverages);

    if (satisfactionSubjects.length > 0) {
        // ── Sheet 3: 객관식 응답 집계 ─────────────────────────────────────
        const distributionSheet = workbook.addWorksheet("객관식 응답 집계");
        const satisfactionQuestions = Object.keys(
            /** @type {any} */ (satisfactionResults.satisfactionAverages[satisfactionSubjects[0]]).scores
        ).filter(q => q !== '전체');
        const distributionHeaders = ["과목명"];
        satisfactionQuestions.forEach(q =>
            distributionHeaders.push(`${q}-매우그렇다`, `${q}-그렇다`, `${q}-보통`, `${q}-그렇지않다`, `${q}-매우그렇지않다`, `${q}-합계`)
        );
        distributionSheet.addRow(distributionHeaders);

        Object.values(satisfactionResults.satisfactionDistribution).forEach(data => {
            const d = /** @type {any} */ (data);
            const subjectName = typeof d.subject === 'object' ? String(d.subject) : d.subject;
            const row = [subjectName];
            satisfactionQuestions.forEach(question => {
                const qd = d.questions[question];
                if (qd) {
                    const values = [qd["매우 그렇다"], qd["그렇다"], qd["보통"], qd["그렇지 않다"], qd["매우 그렇지 않다"]];
                    row.push(...values, values.reduce((a, b) => a + b, 0));
                } else {
                    row.push(0, 0, 0, 0, 0, 0);
                }
            });
            distributionSheet.addRow(row);
        });

        // ── Sheet 4: 평균만족도 ───────────────────────────────────────────
        const averageSheet = workbook.addWorksheet("평균만족도");
        const averageHeaders = ["과목명", "전체", ...satisfactionQuestions];
        averageSheet.addRow(averageHeaders);

        Object.values(satisfactionResults.satisfactionAverages).forEach(data => {
            const d = /** @type {any} */ (data);
            const subjectName = typeof d.subject === 'object' ? String(d.subject) : d.subject;
            const row = [subjectName, d.scores["전체"]];
            satisfactionQuestions.forEach(question => row.push(d.scores[question] || 0));
            averageSheet.addRow(row);
        });
    }

    const excelBuffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    return URL.createObjectURL(blob);
}
