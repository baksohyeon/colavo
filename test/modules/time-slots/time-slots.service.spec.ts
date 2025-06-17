import { GetTimeSlotsDto } from '@/modules/time-slots/dto/get-time-slots.dto';
import { TimeSlotsService } from '@/modules/time-slots/time-slots.service';
import { CustomLoggerService } from '@/core/logger/services/custom-logger.service';
import { TimezoneUtil } from '@/modules/time-slots/utils/timezone.util';
import { DataLoaderService } from '@/modules/time-slots/services/data-loader.service';
import { WorkingHoursCalculatorService } from '@/modules/time-slots/services/working-hours-calculator.service';
import { TimeslotGeneratorService } from '@/modules/time-slots/services/timeslot-generator.service';
import { Test, TestingModule } from '@nestjs/testing';
import { fromZonedTime } from 'date-fns-tz';

// Test constants - KST (Korea Standard Time) test dates
const TEST_DATES = {
    KST_TIMEZONE: 'Asia/Seoul',
    UTC_TIMEZONE: 'UTC',
    EST_TIMEZONE: 'America/New_York',
    GMT_TIMEZONE: 'Europe/London',
    JST_TIMEZONE: 'Asia/Tokyo',
    MAY_9_2021: '20210509',   // Sunday
    MAY_10_2021: '20210510',  // Monday
    MAY_11_2021: '20210511',  // Tuesday
} as const;


// Expected day_modifier values relative to TODAY (2021-09-10) by timezone


describe('TimeSlotsService', () => {
    let service: TimeSlotsService;
    let logger: CustomLoggerService;
    let timezoneUtil: TimezoneUtil;
    let dataLoader: DataLoaderService;
    let workingHoursCalculator: WorkingHoursCalculatorService;
    let timeslotGenerator: TimeslotGeneratorService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TimeSlotsService,
                {
                    provide: CustomLoggerService,
                    useValue: {
                        setContext: jest.fn(),
                        info: jest.fn(),
                        debug: jest.fn(),
                        error: jest.fn(),
                        warn: jest.fn(),
                        verbose: jest.fn(),
                        log: jest.fn(),
                    },
                },
                {
                    provide: TimezoneUtil,
                    useValue: {
                        validateTimezoneIdentifier: jest.fn(),
                        parseStartDayIdentifierWithTimezone: jest.fn(),
                        formatDateInTimezone: jest.fn(),
                        convertToTimezone: jest.fn(),
                        convertFromTimezone: jest.fn(),
                        formatTimeInTimezone: jest.fn(),
                    },
                },
                {
                    provide: DataLoaderService,
                    useValue: {
                        loadEvents: jest.fn().mockResolvedValue([]),
                        loadWorkhours: jest.fn().mockResolvedValue([]),
                    },
                },
                {
                    provide: WorkingHoursCalculatorService,
                    useValue: {
                        calculateWorkingHoursWithTimezone: jest.fn(),
                        getWeekdayUTC: jest.fn(),
                        convertSecondsToTimeString: jest.fn(),
                    },
                },
                {
                    provide: TimeslotGeneratorService,
                    useValue: {
                        generateAllTimeslots: jest.fn(),
                        filterConflictingTimeslotsWithTimezone: jest.fn(),
                        logAvailableTimeslots: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<TimeSlotsService>(TimeSlotsService);
        logger = module.get<CustomLoggerService>(CustomLoggerService);
        timezoneUtil = module.get<TimezoneUtil>(TimezoneUtil);
        dataLoader = module.get<DataLoaderService>(DataLoaderService);
        workingHoursCalculator = module.get<WorkingHoursCalculatorService>(WorkingHoursCalculatorService);
        timeslotGenerator = module.get<TimeslotGeneratorService>(TimeslotGeneratorService);

        // Setup default mock implementations
        (timezoneUtil.parseStartDayIdentifierWithTimezone as jest.Mock).mockImplementation((identifier: string, timezone: string) => {
            const year = parseInt(identifier.substring(0, 4));
            const month = parseInt(identifier.substring(4, 6)) - 1;
            const day = parseInt(identifier.substring(6, 8));
            const dateInTimezone = new Date(year, month, day, 0, 0, 0, 0);
            return fromZonedTime(dateInTimezone, timezone);
        });

        (timezoneUtil.formatDateInTimezone as jest.Mock).mockImplementation((date: Date) => {
            return date.toISOString().split('T')[0];
        });

        (timezoneUtil.convertFromTimezone as jest.Mock).mockImplementation((date: Date, timezone: string) => {
            return fromZonedTime(date, timezone);
        });

        (workingHoursCalculator.getWeekdayUTC as jest.Mock).mockImplementation((date: Date) => {
            return date.getUTCDay() + 1;
        });

        (workingHoursCalculator.calculateWorkingHoursWithTimezone as jest.Mock).mockImplementation((startOfDayUTC: number) => {
            return {
                workStartSeconds: startOfDayUTC,
                workEndSeconds: startOfDayUTC + (24 * 60 * 60) - 1,
            };
        });

        (workingHoursCalculator.convertSecondsToTimeString as jest.Mock).mockImplementation((seconds: number) => {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        });

        (timeslotGenerator.generateAllTimeslots as jest.Mock).mockImplementation((startSeconds: number, endSeconds: number, serviceDuration: number, interval: number) => {
            const timeslots: Array<{ begin_at: number; end_at: number }> = [];
            for (let current = startSeconds; current + serviceDuration <= endSeconds; current += interval) {
                timeslots.push({
                    begin_at: current,
                    end_at: current + serviceDuration,
                });
            }
            return timeslots;
        });

        (timeslotGenerator.filterConflictingTimeslotsWithTimezone as jest.Mock).mockImplementation((timeslots) => {
            return timeslots; // Return all timeslots for testing
        });
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getTimeSlots', () => {
        it('should return array of DayTimetable for valid request', async () => {
            const mockRequest: GetTimeSlotsDto = {
                start_day_identifier: TEST_DATES.MAY_9_2021,
                timezone_identifier: TEST_DATES.KST_TIMEZONE,
                service_duration: 3600,
                days: 1,
                timeslot_interval: 1800,
                is_ignore_schedule: true,
                is_ignore_workhour: true,
            };

            const result = await service.getTimeSlots(mockRequest);

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(1);
            expect(result[0]).toHaveProperty('start_of_day');
            expect(result[0]).toHaveProperty('day_modifier');
            expect(result[0]).toHaveProperty('is_day_off');
            expect(result[0]).toHaveProperty('timeslots');
        });

        it('should return multiple days when days parameter is greater than 1', async () => {
            const mockRequest: GetTimeSlotsDto = {
                start_day_identifier: TEST_DATES.MAY_9_2021,
                timezone_identifier: TEST_DATES.KST_TIMEZONE,
                service_duration: 3600,
                days: 3,
                timeslot_interval: 1800,
                is_ignore_schedule: true,
                is_ignore_workhour: true,
            };

            const result = await service.getTimeSlots(mockRequest);

            expect(result.length).toBe(3);
            // Verify that consecutive day modifiers are generated
            expect(result[1].day_modifier).toBe(result[0].day_modifier + 1);
            expect(result[2].day_modifier).toBe(result[0].day_modifier + 2);
        });

        it('should generate timeslots with correct intervals', async () => {
            const mockRequest: GetTimeSlotsDto = {
                start_day_identifier: TEST_DATES.MAY_9_2021,
                timezone_identifier: TEST_DATES.KST_TIMEZONE,
                service_duration: 3600,
                days: 1,
                timeslot_interval: 1800,
                is_ignore_schedule: true,
                is_ignore_workhour: true,
            };

            const result = await service.getTimeSlots(mockRequest);
            const timeslots = result[0].timeslots;

            if (timeslots.length > 1) {
                const timeDifference = timeslots[1].begin_at - timeslots[0].begin_at;
                expect(timeDifference).toBe(1800); // 30 minutes
            }
        });

        it('should call all required service methods', async () => {
            const mockRequest: GetTimeSlotsDto = {
                start_day_identifier: TEST_DATES.MAY_9_2021,
                timezone_identifier: TEST_DATES.KST_TIMEZONE,
                service_duration: 3600,
                days: 1,
                timeslot_interval: 1800,
                is_ignore_schedule: false,
                is_ignore_workhour: false,
            };

            await service.getTimeSlots(mockRequest);

            expect(timezoneUtil.validateTimezoneIdentifier).toHaveBeenCalledWith(TEST_DATES.KST_TIMEZONE);
            expect(timezoneUtil.parseStartDayIdentifierWithTimezone).toHaveBeenCalledWith(TEST_DATES.MAY_9_2021, TEST_DATES.KST_TIMEZONE);
            expect(dataLoader.loadEvents).toHaveBeenCalled();
            expect(dataLoader.loadWorkhours).toHaveBeenCalled();
        });

        describe('Schedule handling (is_ignore_schedule)', () => {
            it('should not load events when is_ignore_schedule is true', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 1800,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                await service.getTimeSlots(mockRequest);

                expect(dataLoader.loadEvents).not.toHaveBeenCalled();
            });

            it('should load events when is_ignore_schedule is false', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 1800,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: false,
                    is_ignore_workhour: true,
                };

                await service.getTimeSlots(mockRequest);

                expect(dataLoader.loadEvents).toHaveBeenCalled();
            });
        });

        describe('Work hour handling (is_ignore_workhour)', () => {
            it('should not load workhours when is_ignore_workhour is true', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 1800,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                await service.getTimeSlots(mockRequest);

                expect(dataLoader.loadWorkhours).not.toHaveBeenCalled();
            });

            it('should load workhours when is_ignore_workhour is false', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 1800,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: false,
                };

                await service.getTimeSlots(mockRequest);

                expect(dataLoader.loadWorkhours).toHaveBeenCalled();
            });
        });

        describe('Service integration', () => {
            it('should call WorkingHoursCalculatorService methods during day generation', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 3600,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                await service.getTimeSlots(mockRequest);

                expect(workingHoursCalculator.getWeekdayUTC).toHaveBeenCalled();
                expect(workingHoursCalculator.calculateWorkingHoursWithTimezone).toHaveBeenCalled();
            });

            it('should call TimeslotGeneratorService methods during slot generation', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 3600,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                await service.getTimeSlots(mockRequest);

                expect(timeslotGenerator.generateAllTimeslots).toHaveBeenCalled();
                expect(timeslotGenerator.filterConflictingTimeslotsWithTimezone).toHaveBeenCalled();
                expect(timeslotGenerator.logAvailableTimeslots).toHaveBeenCalled();
            });
        });

        describe('Day off handling', () => {
            it('should return empty timeslots for day off when workhours are considered', async () => {
                // Mock workhours with a day off
                const mockWorkhours = [{ weekday: 1, is_day_off: true, open_interval: 0, close_interval: 0 }];
                (dataLoader.loadWorkhours as jest.Mock).mockResolvedValue(mockWorkhours);
                (workingHoursCalculator.getWeekdayUTC as jest.Mock).mockReturnValue(1); // Sunday

                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 3600,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: false,
                };

                const result = await service.getTimeSlots(mockRequest);

                expect(result[0].is_day_off).toBe(true);
                expect(result[0].timeslots).toHaveLength(0);
            });
        });

        describe('Error handling', () => {
            it('should handle timezone validation errors', async () => {
                (timezoneUtil.validateTimezoneIdentifier as jest.Mock).mockImplementation(() => {
                    throw new Error('Invalid timezone identifier');
                });

                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: 'Invalid/Timezone',
                    service_duration: 3600,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                await expect(service.getTimeSlots(mockRequest)).rejects.toThrow('Invalid timezone identifier');
            });

            it('should handle date parsing errors', async () => {
                (timezoneUtil.parseStartDayIdentifierWithTimezone as jest.Mock).mockImplementation(() => {
                    throw new Error('Invalid start_day_identifier format');
                });

                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: 'invalid_date',
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 3600,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                await expect(service.getTimeSlots(mockRequest)).rejects.toThrow('Invalid start_day_identifier format');
            });
        });

        describe('Default parameter handling', () => {
            it('should use default values when optional parameters are not provided', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 3600,
                    // days, timeslot_interval, is_ignore_schedule, is_ignore_workhour not provided
                };

                const result = await service.getTimeSlots(mockRequest);

                expect(result.length).toBe(1); // Default days = 1
                // Verify that default values are used correctly
                expect(timeslotGenerator.generateAllTimeslots).toHaveBeenCalledWith(
                    expect.any(Number),
                    expect.any(Number),
                    3600,
                    1800 // Default timeslot_interval
                );
            });
        });

        describe('Zero cases', () => {
            it('should handle zero days parameter', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 3600,
                    days: 0,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                const result = await service.getTimeSlots(mockRequest);

                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBe(0);
            });
        });

        describe('Logging verification', () => {
            it('should log appropriate messages during execution', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 3600,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                await service.getTimeSlots(mockRequest);

                expect(logger.debug).toHaveBeenCalled();
                expect(logger.info).toHaveBeenCalled();
            });
        });
    });
});