// E2E 테스트 환경에서 로깅 비활성화
process.env.LOG_ENABLE_CONSOLE = "false";
process.env.LOG_LEVEL = "error";

// 애플리케이션 로그만 억제 (Jest 출력은 유지)
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args) => {
  // 타임스탬프가 있는 애플리케이션 로그만 필터링
  if (
    args[0] &&
    typeof args[0] === "string" &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(args[0])
  ) {
    return; // 애플리케이션 로그는 출력하지 않음
  }
  // Jest 출력은 정상 출력
  originalConsoleLog.apply(console, args);
};

console.error = (...args) => {
  // Winston 경고와 애플리케이션 에러 로그만 필터링
  if (args[0] && typeof args[0] === "string") {
    if (
      args[0].includes("[winston]") ||
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(args[0])
    ) {
      return; // 애플리케이션 로그는 출력하지 않음
    }
  }
  // Jest 에러는 정상 출력
  originalConsoleError.apply(console, args);
};
