// 유닛 테스트에서 Winston 경고 억제
const originalConsoleError = console.error;
console.error = (...args) => {
  // Winston 경고 메시지만 필터링
  if (args[0] && typeof args[0] === "string" && args[0].includes("[winston]")) {
    return; // Winston 경고는 출력하지 않음
  }
  // 다른 에러는 정상 출력
  originalConsoleError.apply(console, args);
};
