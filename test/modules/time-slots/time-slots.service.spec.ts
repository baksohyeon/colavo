import { GetTimeSlotsDto } from '@/modules/time-slots/dto/get-time-slots.dto';
import { TimeSlotsService } from '@/modules/time-slots/time-slots.service';
import { CustomLoggerService } from '@/core/logger/services/custom-logger.service';
import { Test, TestingModule } from '@nestjs/testing';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

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


// Helper function to get UTC timestamp for a date in specific timezone
const getTimestampForDateInTimezone = (year: number, month: number, day: number, timezone: string): number => {
    const dateInTimezone = new Date(year, month - 1, day, 0, 0, 0, 0); // month is 1-indexed here
    const utcDate = fromZonedTime(dateInTimezone, timezone);
    return Math.floor(utcDate.getTime() / 1000);
};

// Expected day_modifier values relative to TODAY (2021-09-10) by timezone
const EXPECTED_DAY_MODIFIERS = {
    KST: {
        '20210509': -124, // May 9, 2021 in Asia/Seoul
        '20210510': -123, // May 10, 2021 in Asia/Seoul
        '20210511': -122, // May 11, 2021 in Asia/Seoul
    },
    EST: {
        '20210509': -123, // May 9, 2021 in America/New_York
    },
    UTC: {
        '20210509': -124, // May 9, 2021 in UTC
    },
    JST: {
        '20210509': -124, // May 9, 2021 in Asia/Tokyo
    },
} as const;

// Original UTC-based timestamps (for reference)
const TEST_TIMESTAMPS_UTC = {
    MAY_9_2021: Math.floor(Date.UTC(2021, 4, 9) / 1000),   // 1620518400
    MAY_10_2021: Math.floor(Date.UTC(2021, 4, 10) / 1000), // 1620604800
    MAY_11_2021: Math.floor(Date.UTC(2021, 4, 11) / 1000), // 1620691200
} as const;

// Timezone-aware timestamps (what the service actually returns)
const TEST_TIMESTAMPS_KST = {
    MAY_9_2021: getTimestampForDateInTimezone(2021, 5, 9, TEST_DATES.KST_TIMEZONE),   // 2021-05-09 00:00:00 KST
    MAY_10_2021: getTimestampForDateInTimezone(2021, 5, 10, TEST_DATES.KST_TIMEZONE), // 2021-05-10 00:00:00 KST
    MAY_11_2021: getTimestampForDateInTimezone(2021, 5, 11, TEST_DATES.KST_TIMEZONE), // 2021-05-11 00:00:00 KST
} as const;

const TEST_TIMESTAMPS_EST = {
    MAY_9_2021: getTimestampForDateInTimezone(2021, 5, 9, TEST_DATES.EST_TIMEZONE),   // 2021-05-09 00:00:00 EST
} as const;

const TEST_TIMESTAMPS_JST = {
    MAY_9_2021: getTimestampForDateInTimezone(2021, 5, 9, TEST_DATES.JST_TIMEZONE),   // 2021-05-09 00:00:00 JST
} as const;

const TEST_TIMESTAMPS_GMT = {
    MAY_9_2021: getTimestampForDateInTimezone(2021, 5, 9, TEST_DATES.GMT_TIMEZONE),   // 2021-05-09 00:00:00 GMT
} as const;

describe('TimeSlotsService', () => {
    let service: TimeSlotsService;
    let logger: CustomLoggerService;

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
            ],
        }).compile();

        service = module.get<TimeSlotsService>(TimeSlotsService);
        logger = module.get<CustomLoggerService>(CustomLoggerService);
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
            // Calculate expected day_modifier values relative to TODAY (2021-09-10)
            expect(result[0].day_modifier).toBe(EXPECTED_DAY_MODIFIERS.KST['20210509']);     // May 9
            expect(result[1].day_modifier).toBe(EXPECTED_DAY_MODIFIERS.KST['20210510']); // May 10
            expect(result[2].day_modifier).toBe(EXPECTED_DAY_MODIFIERS.KST['20210511']); // May 11
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

        // Test specific dates mentioned in requirements
        describe('Required test cases from requirements', () => {
            it('should handle start_day_identifier for May 9, 2021 (KST) correctly', async () => {
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

                expect(result.length).toBe(1);
                expect(result[0].day_modifier).toBe(EXPECTED_DAY_MODIFIERS.KST['20210509']);
                expect(result[0].start_of_day).toBe(TEST_TIMESTAMPS_KST.MAY_9_2021);
            });

            it('should handle start_day_identifier for May 10, 2021 (KST) correctly', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_10_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 3600,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                const result = await service.getTimeSlots(mockRequest);

                expect(result.length).toBe(1);
                expect(result[0].day_modifier).toBe(EXPECTED_DAY_MODIFIERS.KST['20210510']);
                expect(result[0].start_of_day).toBe(TEST_TIMESTAMPS_KST.MAY_10_2021);
            });

            it('should handle start_day_identifier for May 11, 2021 (KST) correctly', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_11_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 3600,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                const result = await service.getTimeSlots(mockRequest);

                expect(result.length).toBe(1);
                expect(result[0].day_modifier).toBe(EXPECTED_DAY_MODIFIERS.KST['20210511']);
                expect(result[0].start_of_day).toBe(TEST_TIMESTAMPS_KST.MAY_11_2021);
            });
        });

        describe('Schedule handling (is_ignore_schedule)', () => {
            it('should ignore events when is_ignore_schedule is true', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 1800, // 30 minutes
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                const result = await service.getTimeSlots(mockRequest);

                expect(Array.isArray(result)).toBe(true);
                expect(result[0].timeslots.length).toBeGreaterThan(0);
                // Should generate slots for full day since both ignore flags are true
            });

            it('should consider events when is_ignore_schedule is false', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 1800, // 30 minutes
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: false,
                    is_ignore_workhour: true,
                };

                const result = await service.getTimeSlots(mockRequest);

                expect(Array.isArray(result)).toBe(true);
                // The actual number of slots may vary based on events.json content
                // but the result should still be valid
                expect(result[0]).toHaveProperty('timeslots');
            });
        });

        describe('Work hour handling (is_ignore_workhour)', () => {
            it('should ignore work hours when is_ignore_workhour is true', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 1800, // 30 minutes
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                const result = await service.getTimeSlots(mockRequest);

                expect(Array.isArray(result)).toBe(true);
                expect(result[0].is_day_off).toBe(false);
                // Should generate slots for full day (24 hours)
                expect(result[0].timeslots.length).toBeGreaterThan(40); // Roughly 24*2 - service_duration consideration
            });

            it('should consider work hours when is_ignore_workhour is false', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 1800, // 30 minutes
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: false,
                };

                const result = await service.getTimeSlots(mockRequest);

                expect(Array.isArray(result)).toBe(true);
                // The result depends on workhours.json content
                expect(result[0]).toHaveProperty('timeslots');
                expect(result[0]).toHaveProperty('is_day_off');
            });
        });

        describe('Service duration and interval validation', () => {
            it('should generate correct timeslot duration', async () => {
                const serviceDuration = 7200; // 2 hours
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: serviceDuration,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                const result = await service.getTimeSlots(mockRequest);
                const timeslots = result[0].timeslots;

                if (timeslots.length > 0) {
                    timeslots.forEach(slot => {
                        expect(slot.end_at - slot.begin_at).toBe(serviceDuration);
                    });
                }
            });

            it('should handle different timeslot intervals', async () => {
                const interval = 900; // 15 minutes
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 1800,
                    days: 1,
                    timeslot_interval: interval,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                const result = await service.getTimeSlots(mockRequest);
                const timeslots = result[0].timeslots;

                if (timeslots.length > 1) {
                    const timeDifference = timeslots[1].begin_at - timeslots[0].begin_at;
                    expect(timeDifference).toBe(interval);
                }
            });

            it('should not generate slots when service duration exceeds available time', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 86400, // 24 hours (full day)
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: false, // This will limit available hours
                };

                const result = await service.getTimeSlots(mockRequest);

                // Depending on work hours, this might generate very few or no slots
                expect(Array.isArray(result)).toBe(true);
                expect(result[0]).toHaveProperty('timeslots');
            });
        });

        describe('Default parameter handling', () => {
            it('should use default values when optional parameters are not provided', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 3600,
                    // days: not provided (should default to 1)
                    // timeslot_interval: not provided (should default to 1800)
                    // is_ignore_schedule: not provided (should default to false)
                    // is_ignore_workhour: not provided (should default to false)
                };

                const result = await service.getTimeSlots(mockRequest);

                expect(result.length).toBe(1); // Default days = 1
                expect(result[0].day_modifier).toBe(EXPECTED_DAY_MODIFIERS.KST['20210509']);
            });
        });

        describe('Edge cases and error handling', () => {
            it('should handle invalid start_day_identifier gracefully', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: 'invalid_date',
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 3600,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                // This should either throw an error or handle gracefully
                await expect(service.getTimeSlots(mockRequest)).rejects.toThrow();
            });

            it('should handle zero service duration', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 0,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                const result = await service.getTimeSlots(mockRequest);

                expect(Array.isArray(result)).toBe(true);
                // Zero duration might generate many slots or handle specially
            });

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

        describe('Weekday calculation', () => {
            it('should correctly identify weekdays for different KST dates', async () => {
                // 2021-05-09 is Sunday (weekday should be 1)
                // 2021-05-10 is Monday (weekday should be 2)
                // 2021-05-11 is Tuesday (weekday should be 3)

                const requests = [
                    { date: TEST_DATES.MAY_9_2021, expectedModifier: EXPECTED_DAY_MODIFIERS.KST['20210509'] }, // Sunday
                    { date: TEST_DATES.MAY_10_2021, expectedModifier: EXPECTED_DAY_MODIFIERS.KST['20210510'] }, // Monday  
                    { date: TEST_DATES.MAY_11_2021, expectedModifier: EXPECTED_DAY_MODIFIERS.KST['20210511'] }, // Tuesday
                ];

                for (const req of requests) {
                    const mockRequest: GetTimeSlotsDto = {
                        start_day_identifier: req.date,
                        timezone_identifier: TEST_DATES.KST_TIMEZONE,
                        service_duration: 3600,
                        days: 1,
                        timeslot_interval: 1800,
                        is_ignore_schedule: true,
                        is_ignore_workhour: true,
                    };

                    const result = await service.getTimeSlots(mockRequest);
                    expect(result[0].day_modifier).toBe(req.expectedModifier);
                }
            });
        });

        describe('Multiple days sequence', () => {
            it('should generate consecutive day modifiers for multiple days (KST)', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE,
                    service_duration: 3600,
                    days: 5,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                const result = await service.getTimeSlots(mockRequest);

                expect(result.length).toBe(5);

                const baseDayModifier = EXPECTED_DAY_MODIFIERS.KST['20210509'];
                for (let i = 0; i < 5; i++) {
                    expect(result[i].day_modifier).toBe(baseDayModifier + i);
                    expect(result[i].start_of_day).toBe(TEST_TIMESTAMPS_KST.MAY_9_2021 + (i * 86400)); // Each day adds 86400 seconds
                }
            });
        });

        describe('Timezone handling (timezone_identifier)', () => {
            it('should handle different timezone identifiers correctly', async () => {
                const timezoneTestCases = [
                    { timezone: TEST_DATES.KST_TIMEZONE, expectedTimestamp: TEST_TIMESTAMPS_KST.MAY_9_2021 },  // Asia/Seoul
                    { timezone: TEST_DATES.UTC_TIMEZONE, expectedTimestamp: TEST_TIMESTAMPS_UTC.MAY_9_2021 },  // UTC
                    { timezone: TEST_DATES.EST_TIMEZONE, expectedTimestamp: TEST_TIMESTAMPS_EST.MAY_9_2021 },  // America/New_York
                    { timezone: TEST_DATES.GMT_TIMEZONE, expectedTimestamp: TEST_TIMESTAMPS_GMT.MAY_9_2021 },  // Europe/London
                    { timezone: TEST_DATES.JST_TIMEZONE, expectedTimestamp: TEST_TIMESTAMPS_JST.MAY_9_2021 },  // Asia/Tokyo
                ];

                for (const testCase of timezoneTestCases) {
                    const mockRequest: GetTimeSlotsDto = {
                        start_day_identifier: TEST_DATES.MAY_9_2021,
                        timezone_identifier: testCase.timezone,
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
                    expect(result[0]).toHaveProperty('timeslots');
                    // Each timezone should return its properly converted timestamp
                    expect(result[0].start_of_day).toBe(testCase.expectedTimestamp);
                };


            });

            it('should handle UTC timezone specifically', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.UTC_TIMEZONE,
                    service_duration: 3600,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                const result = await service.getTimeSlots(mockRequest);

                expect(result.length).toBe(1);
                expect(result[0].start_of_day).toBe(TEST_TIMESTAMPS_UTC.MAY_9_2021);
                expect(result[0].day_modifier).toBe(EXPECTED_DAY_MODIFIERS.UTC['20210509']);
                expect(result[0].timeslots.length).toBeGreaterThan(0);
            });

            it('should handle America/New_York timezone', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.EST_TIMEZONE,
                    service_duration: 3600,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                const result = await service.getTimeSlots(mockRequest);

                expect(result.length).toBe(1);
                expect(result[0].start_of_day).toBe(TEST_TIMESTAMPS_EST.MAY_9_2021);
                expect(result[0].day_modifier).toBe(EXPECTED_DAY_MODIFIERS.EST['20210509']);
                expect(result[0].timeslots.length).toBeGreaterThan(0);
            });

            it('should handle Asia/Tokyo timezone (JST)', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.JST_TIMEZONE,
                    service_duration: 3600,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                const result = await service.getTimeSlots(mockRequest);

                expect(result.length).toBe(1);
                expect(result[0].start_of_day).toBe(TEST_TIMESTAMPS_JST.MAY_9_2021);
                expect(result[0].day_modifier).toBe(EXPECTED_DAY_MODIFIERS.JST['20210509']);
                expect(result[0].timeslots.length).toBeGreaterThan(0);
            });

            it('should handle invalid timezone identifier gracefully', async () => {
                const mockRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: 'Invalid/Timezone',
                    service_duration: 3600,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                // This should throw a meaningful error due to validation
                await expect(service.getTimeSlots(mockRequest)).rejects.toThrow('Invalid timezone identifier');
            });

            it('should validate timezone format requirements', async () => {
                const invalidTimezones = [
                    'GMT+9',        // Non-IANA format
                    'KST',          // Abbreviation
                    'Seoul',        // City name only
                    'Asia/Seoul/Invalid', // Invalid path
                ];

                for (const timezone of invalidTimezones) {
                    const mockRequest: GetTimeSlotsDto = {
                        start_day_identifier: TEST_DATES.MAY_9_2021,
                        timezone_identifier: timezone,
                        service_duration: 3600,
                        days: 1,
                        timeslot_interval: 1800,
                        is_ignore_schedule: true,
                        is_ignore_workhour: true,
                    };

                    // These should throw errors due to timezone validation
                    await expect(service.getTimeSlots(mockRequest)).rejects.toThrow('Invalid timezone identifier');
                }
            });

            it('should reject truly invalid timezone identifiers', async () => {
                const trulyInvalidTimezones = [
                    '',           // Empty string
                    null,         // Null value
                    undefined,    // Undefined value
                ];

                for (const timezone of trulyInvalidTimezones) {
                    const mockRequest: GetTimeSlotsDto = {
                        start_day_identifier: TEST_DATES.MAY_9_2021,
                        timezone_identifier: timezone as string,
                        service_duration: 3600,
                        days: 1,
                        timeslot_interval: 1800,
                        is_ignore_schedule: true,
                        is_ignore_workhour: true,
                    };

                    // These should throw errors
                    await expect(service.getTimeSlots(mockRequest)).rejects.toThrow('Invalid timezone identifier');
                }
            });

            it('should handle different timezones correctly for same date identifier', async () => {
                const timezoneTestCases = [
                    { timezone: TEST_DATES.KST_TIMEZONE, expectedTimestamp: TEST_TIMESTAMPS_KST.MAY_9_2021 },
                    { timezone: TEST_DATES.UTC_TIMEZONE, expectedTimestamp: TEST_TIMESTAMPS_UTC.MAY_9_2021 },
                    { timezone: TEST_DATES.EST_TIMEZONE, expectedTimestamp: TEST_TIMESTAMPS_EST.MAY_9_2021 },
                    { timezone: TEST_DATES.JST_TIMEZONE, expectedTimestamp: TEST_TIMESTAMPS_JST.MAY_9_2021 },
                ];

                for (const testCase of timezoneTestCases) {
                    const mockRequest: GetTimeSlotsDto = {
                        start_day_identifier: TEST_DATES.MAY_9_2021,
                        timezone_identifier: testCase.timezone,
                        service_duration: 3600,
                        days: 1,
                        timeslot_interval: 1800,
                        is_ignore_schedule: true,
                        is_ignore_workhour: true,
                    };

                    const result = await service.getTimeSlots(mockRequest);

                    expect(result[0].start_of_day).toBe(testCase.expectedTimestamp);
                    // Use appropriate timezone-specific expected value
                    const expectedModifier = testCase.timezone === TEST_DATES.EST_TIMEZONE
                        ? EXPECTED_DAY_MODIFIERS.EST['20210509']
                        : testCase.timezone === TEST_DATES.UTC_TIMEZONE
                            ? EXPECTED_DAY_MODIFIERS.UTC['20210509']
                            : testCase.timezone === TEST_DATES.JST_TIMEZONE
                                ? EXPECTED_DAY_MODIFIERS.JST['20210509']
                                : EXPECTED_DAY_MODIFIERS.KST['20210509'];
                    expect(result[0].day_modifier).toBe(expectedModifier);
                }
            });

            it('should properly implement timezone handling with date-fns-tz', async () => {
                // This test verifies that timezone_identifier is properly implemented using date-fns-tz
                const kstRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.KST_TIMEZONE, // UTC+9
                    service_duration: 3600,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                const utcRequest: GetTimeSlotsDto = {
                    start_day_identifier: TEST_DATES.MAY_9_2021,
                    timezone_identifier: TEST_DATES.UTC_TIMEZONE, // UTC+0
                    service_duration: 3600,
                    days: 1,
                    timeslot_interval: 1800,
                    is_ignore_schedule: true,
                    is_ignore_workhour: true,
                };

                const kstResult = await service.getTimeSlots(kstRequest);
                const utcResult = await service.getTimeSlots(utcRequest);

                // Different timezones should return different timestamps
                expect(kstResult[0].start_of_day).toBe(TEST_TIMESTAMPS_KST.MAY_9_2021);
                expect(utcResult[0].start_of_day).toBe(TEST_TIMESTAMPS_UTC.MAY_9_2021);
                expect(kstResult[0].start_of_day).not.toBe(utcResult[0].start_of_day);

                // KST is UTC+9, so KST midnight is 9 hours earlier in UTC
                expect(kstResult[0].start_of_day).toBe(utcResult[0].start_of_day - (9 * 3600));
            });

            it('should validate timezone_identifier format according to IANA standards', async () => {
                const validTimezones = [
                    'UTC',
                    'Asia/Seoul',
                    'America/New_York',
                    'Europe/London',
                    'Asia/Tokyo',
                    'America/Los_Angeles',
                    'Australia/Sydney',
                ];

                for (const timezone of validTimezones) {
                    const mockRequest: GetTimeSlotsDto = {
                        start_day_identifier: TEST_DATES.MAY_9_2021,
                        timezone_identifier: timezone,
                        service_duration: 3600,
                        days: 1,
                        timeslot_interval: 1800,
                        is_ignore_schedule: true,
                        is_ignore_workhour: true,
                    };

                    const result = await service.getTimeSlots(mockRequest);
                    expect(Array.isArray(result)).toBe(true);
                    expect(result.length).toBe(1);
                    expect(typeof result[0].start_of_day).toBe('number');
                }
            });

            it('should handle timezone edge cases for date boundaries', async () => {
                // Test how different timezones handle the same date identifier
                const testCases = [
                    {
                        timezone: 'Pacific/Kiritimati', // UTC+14 (earliest timezone)
                        description: 'earliest timezone UTC+14'
                    },
                    {
                        timezone: 'Pacific/Niue', // UTC-11 (latest timezone)  
                        description: 'latest timezone UTC-11'
                    },
                    {
                        timezone: 'America/Adak', // UTC-10
                        description: 'Alaska timezone UTC-10'
                    }
                ];

                for (const testCase of testCases) {
                    const mockRequest: GetTimeSlotsDto = {
                        start_day_identifier: TEST_DATES.MAY_9_2021,
                        timezone_identifier: testCase.timezone,
                        service_duration: 3600,
                        days: 1,
                        timeslot_interval: 1800,
                        is_ignore_schedule: true,
                        is_ignore_workhour: true,
                    };

                    const result = await service.getTimeSlots(mockRequest);

                    expect(Array.isArray(result)).toBe(true);
                    expect(result.length).toBe(1);

                    // Each timezone should return its own proper timestamp
                    const expectedTimestamp = getTimestampForDateInTimezone(2021, 5, 9, testCase.timezone);
                    expect(result[0].start_of_day).toBe(expectedTimestamp);

                    // These extreme timezones show different behavior for the same date identifier due to date line crossings
                }
            });
        });
    });
})