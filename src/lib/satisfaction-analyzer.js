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

// Helper function to generate the Excel file and return a blob URL
async function generateExcelFile(analysisResults, XLSX) {
    if (!analysisResults || !XLSX) return null;

    const workbook = XLSX.utils.book_new();

    // Sheet 1: Respondent Characteristics
    const respondentData = [];
    const respondentHeaders = [
        "교육과목", "성별-남", "성별-여", "성별-합계",
        ...Object.keys(regionMapping), "기타지역", "지역-합계",
        "19세 이하", "20대", "30대", "40대", "50대", "60대", "70대이상", "연령-합계",
        "직장인", "자영업", "농어업축산임업", "주부", "학생", "기타", "직업-합계",
    ];
    respondentData.push(respondentHeaders);

    Object.values(analysisResults.respondentCharacteristics).forEach(data => {
        const row = [data.subject];
        row.push(data.gender.남성, data.gender.여성, data.gender.남성 + data.gender.여성);
        Object.keys(regionMapping).forEach(region => row.push(data.region[region] || 0));
        row.push(data.region.기타지역);
        row.push(Object.values(data.region).reduce((a, b) => a + b, 0));
        Object.keys(data.age).forEach(age => row.push(data.age[age]));
        row.push(Object.values(data.age).reduce((a, b) => a + b, 0));
        Object.keys(data.job).forEach(job => row.push(data.job[job]));
        row.push(Object.values(data.job).reduce((a, b) => a + b, 0));
        respondentData.push(row);
    });
    const respondentSheet = XLSX.utils.aoa_to_sheet(respondentData);
    XLSX.utils.book_append_sheet(workbook, respondentSheet, "응답자 특성");

    const satisfactionSubjects = Object.keys(analysisResults.satisfactionAverages);

    if (satisfactionSubjects.length > 0) {
        // Sheet 2: Likert Scale Distribution
        const distributionData = [];
        const satisfactionQuestions = Object.keys(analysisResults.satisfactionAverages[satisfactionSubjects[0]].scores).filter(q => q !== '전체');
        const distributionHeaders = ["과목명"];
        satisfactionQuestions.forEach(q => distributionHeaders.push(`${q}-매우그렇다`, `${q}-그렇다`, `${q}-보통`, `${q}-그렇지않다`, `${q}-매우그렇지않다`, `${q}-합계`));
        distributionData.push(distributionHeaders);

        Object.values(analysisResults.satisfactionDistribution).forEach(data => {
            const row = [data.subject];
            satisfactionQuestions.forEach(question => {
                const questionData = data.questions[question];
                if (questionData) {
                    const values = [questionData["매우 그렇다"], questionData["그렇다"], questionData["보통"], questionData["그렇지 않다"], questionData["매우 그렇지 않다"]];
                    row.push(...values, values.reduce((a, b) => a + b, 0));
                } else {
                    row.push(0, 0, 0, 0, 0, 0);
                }
            });
            distributionData.push(row);
        });
        const distributionSheet = XLSX.utils.aoa_to_sheet(distributionData);
        XLSX.utils.book_append_sheet(workbook, distributionSheet, "객관식 응답 집계");

        // Sheet 3: Average Satisfaction Scores
        const averageData = [];
        const averageHeaders = ["과목명", "전체", ...satisfactionQuestions];
        averageData.push(averageHeaders);

        Object.values(analysisResults.satisfactionAverages).forEach(data => {
            const row = [data.subject, data.scores["전체"]];
            satisfactionQuestions.forEach(question => row.push(data.scores[question] || 0));
            averageData.push(row);
        });
        const averageSheet = XLSX.utils.aoa_to_sheet(averageData);
        XLSX.utils.book_append_sheet(workbook, averageSheet, "평균만족도");
    }

    // Generate Blob URL
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    return URL.createObjectURL(blob);
}


/**
 * Analyzes satisfaction survey data from an Excel file.
 * @param {Array<Object>} rawData - The raw data array from the Excel sheet.
 * @param {Object} XLSX - The window.XLSX library object.
 * @returns {Promise<Object>} A promise that resolves to an object containing analysis results and a download URL.
 * @note The download URL is a Blob URL that should be revoked using URL.revokeObjectURL() when no longer needed.
 */
export async function analyzeSatisfactionData(rawData, XLSX) {
    if (!rawData || rawData.length === 0) {
        throw new Error("분석할 데이터가 없습니다.");
    }

    // 데이터 크기 검증 (너무 큰 데이터 방지)
    if (rawData.length > 100000) {
        throw new Error("데이터가 너무 큽니다. 최대 100,000행까지 분석 가능합니다.");
    }

    const headers = Object.keys(rawData[0]);
    const dataRows = rawData;

    const columnIndexes = {
        serialNumber: headers.findIndex(h => h.includes('연번')),
        subject: headers.findIndex(h => h.includes('과목명')),
        gender: 4,
        region: 5,
        age: 6,
        job: 7,
    };

    const questionPatterns = ["2-1.*적극", "2-2.*전문", "2-3.*충실", "2-4.*시간", "2-5.*활용", "2-6.*유익", "2-7.*교재", "2-8.*시설", "2-9.*만족"];
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
        // Initialize structures
        respondentCharacteristics[subject] = { subject, gender: { 남성: 0, 여성: 0 }, region: Object.fromEntries(Object.keys(regionMapping).map(k => [k, 0])), age: {"19세 이하":0, "20대":0, "30대":0, "40대":0, "50대":0, "60대":0, "70대이상":0}, job: {"직장인":0, "자영업":0, "농어업축산임업":0, "주부":0, "학생":0, "기타":0} };
        respondentCharacteristics[subject].region['기타지역'] = 0;
        satisfactionDistribution[subject] = { subject, questions: {} };
        satisfactionAverages[subject] = { subject, scores: {} };

        // Process rows
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
        satisfactionAverages[subject].scores["전체"] = questionScores.length > 0 ? (questionScores.reduce((a, b) => a + b, 0) / questionScores.length).toFixed(2) : 0;
    }

    const analysisResults = {
        respondentCharacteristics,
        satisfactionDistribution,
        satisfactionAverages,
        totalSubjects: Object.keys(subjectGroups).length,
        totalResponses: dataRows.length,
    };

    const url = await generateExcelFile(analysisResults, XLSX);

    return {
        results: analysisResults,
        downloadUrl: url,
    };
}
