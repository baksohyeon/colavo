// E2E 테스트 환경에서 로깅 비활성화
process.env.LOG_ENABLE_CONSOLE = "false";
process.env.LOG_LEVEL = "error";

// Jest 전역 console 출력 억제
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};
