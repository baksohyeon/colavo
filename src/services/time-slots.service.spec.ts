import { Test, TestingModule } from '@nestjs/testing';
import { TimeSlotsService } from './time-slots.service';
import { GetTimeSlotsDto } from '../dto/get-time-slots.dto';

describe('TimeSlotsService', () => {
    let service: TimeSlotsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TimeSlotsService],
        }).compile();

        service = module.get<TimeSlotsService>(TimeSlotsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getTimeSlots', () => {
        it('should return array of DayTimetable for valid request', async () => {
            const mockRequest: GetTimeSlotsDto = {
                start_day_identifier: '20210509',
                timezone_identifier: 'Asia/Seoul',
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
                start_day_identifier: '20210509',
                timezone_identifier: 'Asia/Seoul',
                service_duration: 3600,
                days: 3,
                timeslot_interval: 1800,
                is_ignore_schedule: true,
                is_ignore_workhour: true,
            };

            const result = await service.getTimeSlots(mockRequest);

            expect(result.length).toBe(3);
            expect(result[0].day_modifier).toBe(0);
            expect(result[1].day_modifier).toBe(1);
            expect(result[2].day_modifier).toBe(2);
        });

        it('should generate timeslots with correct intervals', async () => {
            const mockRequest: GetTimeSlotsDto = {
                start_day_identifier: '20210509',
                timezone_identifier: 'Asia/Seoul',
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
    });
}); 