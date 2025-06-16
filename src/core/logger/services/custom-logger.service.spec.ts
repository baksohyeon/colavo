import { Test, TestingModule } from '@nestjs/testing';
import { CustomConfigService } from '../../config/services/config.service';
import { CustomLoggerService } from './custom-logger.service';
import { LogLevel } from '../interfaces/logger.interface';

describe('CustomLoggerService', () => {
    let service: CustomLoggerService;
    let configService: CustomConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomLoggerService,
                {
                    provide: CustomConfigService,
                    useValue: {
                        logger: {
                            level: LogLevel.ERROR,
                            enableConsole: false,
                            enableFile: false,
                            filePath: 'logs/application-%DATE%.log',
                            maxFileSize: '20m',
                            maxFiles: '14d',
                            format: 'simple',
                        },
                    },
                },
            ],
        }).compile();

        service = module.get<CustomLoggerService>(CustomLoggerService);
        configService = module.get<CustomConfigService>(CustomConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('setContext', () => {
        it('should set the logging context', () => {
            const testContext = 'TestContext';
            service.setContext(testContext);

            expect(service).toBeDefined();
        });
    });

    describe('error', () => {
        it('should log error messages', () => {
            const message = 'Test error message';
            const trace = 'Error stack trace';
            const context = 'TestContext';

            const loggerSpy = jest.spyOn((service as any).winstonLogger, 'error').mockImplementation();

            service.error(message, trace, context);

            expect(loggerSpy).toHaveBeenCalledWith(message, {
                context,
                trace,
                timestamp: expect.any(String),
            });

            loggerSpy.mockRestore();
        });

        it('should log error messages without trace', () => {
            const message = 'Test error message';
            const context = 'TestContext';

            const loggerSpy = jest.spyOn((service as any).winstonLogger, 'error').mockImplementation();

            service.error(message, undefined, context);

            expect(loggerSpy).toHaveBeenCalledWith(message, {
                context,
                trace: undefined,
                timestamp: expect.any(String),
            });

            loggerSpy.mockRestore();
        });
    });

    describe('warn', () => {
        it('should log warning messages', () => {
            const message = 'Test warning message';
            const context = 'TestContext';

            const loggerSpy = jest.spyOn((service as any).winstonLogger, 'warn').mockImplementation();

            service.warn(message, context);

            expect(loggerSpy).toHaveBeenCalledWith(message, {
                context,
                timestamp: expect.any(String),
            });

            loggerSpy.mockRestore();
        });
    });

    describe('info', () => {
        it('should log info messages', () => {
            const message = 'Test info message';
            const context = 'TestContext';

            const loggerSpy = jest.spyOn((service as any).winstonLogger, 'info').mockImplementation();

            service.info(message, context);

            expect(loggerSpy).toHaveBeenCalledWith(message, {
                context,
                timestamp: expect.any(String),
            });

            loggerSpy.mockRestore();
        });
    });

    describe('debug', () => {
        it('should log debug messages', () => {
            const message = 'Test debug message';
            const context = 'TestContext';

            const loggerSpy = jest.spyOn((service as any).winstonLogger, 'debug').mockImplementation();

            service.debug(message, context);

            expect(loggerSpy).toHaveBeenCalledWith(message, {
                context,
                timestamp: expect.any(String),
            });

            loggerSpy.mockRestore();
        });
    });

    describe('verbose', () => {
        it('should log verbose messages', () => {
            const message = 'Test verbose message';
            const context = 'TestContext';

            const loggerSpy = jest.spyOn((service as any).winstonLogger, 'verbose').mockImplementation();

            service.verbose(message, context);

            expect(loggerSpy).toHaveBeenCalledWith(message, {
                context,
                timestamp: expect.any(String),
            });

            loggerSpy.mockRestore();
        });
    });

    describe('log', () => {
        it('should log with custom level and metadata', () => {
            const level = LogLevel.INFO;
            const message = 'Test custom log message';
            const context = 'TestContext';
            const metadata = { userId: '123', action: 'test' };

            const loggerSpy = jest.spyOn((service as any).winstonLogger, 'log').mockImplementation();

            service.log(level, message, context, metadata);

            expect(loggerSpy).toHaveBeenCalledWith(level, message, {
                context,
                timestamp: expect.any(String),
                ...metadata,
            });

            loggerSpy.mockRestore();
        });

        it('should handle NestJS LoggerService compatibility', () => {
            const message = 'Test compatibility message';
            const context = 'TestContext';

            const infoSpy = jest.spyOn(service, 'info').mockImplementation();

            service.log(message, context);

            expect(infoSpy).toHaveBeenCalledWith(message, context);

            infoSpy.mockRestore();
        });
    });

    describe('configuration', () => {
        it('should load configuration from ConfigService', () => {
            expect(configService.logger).toBeDefined();
            expect(configService.logger.level).toBe(LogLevel.ERROR);
            expect(configService.logger.enableConsole).toBe(false);
            expect(configService.logger.enableFile).toBe(false);
        });
    });
}); 