/**
 * 나이를 계산하는 함수
 * @param {string | number} birthDate - 생년월일 (e.g., '1990.01.01' or '1990-01-01')
 * @returns {number | null} - 만 나이 (유효하지 않은 생년월일이면 null)
 */
export function calculateAge(birthDate) {
  if (!birthDate) return null;

  const dateStr = birthDate.toString().trim();
  let parts;

  if (dateStr.includes('.')) {
    parts = dateStr.split('.');
  } else if (dateStr.includes('-')) {
    parts = dateStr.split('-');
  } else {
    return null;
  }

  const [year, month, day] = parts.map(Number);

  // 숫자 파싱 검증 (빈 값/문자 포함 시 NaN)
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const birth = new Date(year, month - 1, day);

  // 존재하지 않는 날짜(예: 2024.02.30) 자동 보정 탐지
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) {
    return null;
  }

  const today = new Date();

  // 미래 생년월일 방지
  if (birth > today) return null;

  let age = today.getFullYear() - birth.getFullYear();

  if (today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * 나이를 바탕으로 연령대를 반환하는 함수
 * @param {number} age - 나이
 * @returns {string} - 연령대 문자열
 */
export function getAgeGroup(age) {
  if (age <= 19) return '19세 이하';
  if (age < 30) return '20대';
  if (age < 40) return '30대';
  if (age < 50) return '40대';
  if (age < 60) return '50대';
  return '60대 이상';
}

// 상수 정의
const MAX_ROWS = 100000;

/**
 * 출석 데이터를 분석하는 함수
 * @param {Array<Object>} data - 구조화된 출석 데이터 배열
 * @param {Object} subjectCompletionRates - 과목별 수료 기준율
 * @returns {Object} - 분석 결과 객체
 */
export function analyzeData(data, subjectCompletionRates) {
  if (!data) return null;

  // 데이터 크기 검증
  if (data.length > MAX_ROWS) {
    throw new Error(`데이터가 너무 큽니다. 최대 ${MAX_ROWS.toLocaleString()}행까지 분석 가능합니다.`);
  }

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
    평균출석률: stats.수강인원 > 0 ? (stats.출석률합계 / stats.수강인원) : 0,
    수료인원: stats.수료인원,
    수료율: stats.수강인원 > 0 ? (stats.수료인원 / stats.수강인원) : 0
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

  const totalStudents = data.length; // Use data.length for total enrollments
  const genderDistribution = {
    여성: { 명수: genderStats.여성, 비율: totalStudents > 0 ? (genderStats.여성 / totalStudents * 100) : 0 },
    남성: { 명수: genderStats.남성, 비율: totalStudents > 0 ? (genderStats.남성 / totalStudents * 100) : 0 },
    합계: { 명수: genderStats.여성 + genderStats.남성, 비율: totalStudents > 0 ? 100 : 0 }
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
    '1강좌': { 명수: courseCountStats[1], 비율: uniqueStudents > 0 ? (courseCountStats[1] / uniqueStudents * 100) : 0 },
    '2강좌': { 명수: courseCountStats[2], 비율: uniqueStudents > 0 ? (courseCountStats[2] / uniqueStudents * 100) : 0 },
    '3강좌 이상': { 명수: courseCountStats['3이상'], 비율: uniqueStudents > 0 ? (courseCountStats['3이상'] / uniqueStudents * 100) : 0 }
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
    if (age === null) return; // 유효하지 않은 생년월일은 연령 집계에서 제외
    const ageGroup = getAgeGroup(age);
    ageStats[ageGroup]++;
  });

  const ageDistribution = {};
  Object.entries(ageStats).forEach(([ageGroup, count]) => {
    ageDistribution[ageGroup] = {
      명수: count,
      비율: totalStudents > 0 ? (count / totalStudents * 100) : 0
    };
  });

  return {
    subjectResults,
    genderDistribution,
    courseCountDistribution,
    ageDistribution,
    totalStudents,
    uniqueStudents
  };
}
