import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { TimeSlotsService } from '@/modules/time-slots/services/time-slots.service';
import { IDayTimetable } from '@/models/interfaces';
import { GetTimeSlotsDto } from '@/modules/time-slots/dto/get-time-slots.dto';

@Controller()
export class TimeSlotsController {
    constructor(private readonly timeSlotsService: TimeSlotsService) { }

    /**
     * Get available time slots for booking
     * @param dto Request parameters for time slot generation
     * @returns Array of DayTimetable with available time slots
     */
    @Post('getTimeSlots')
    @HttpCode(HttpStatus.OK)
    async getTimeSlots(@Body() dto: GetTimeSlotsDto): Promise<IDayTimetable[]> {
        return await this.timeSlotsService.getTimeSlots(dto);
    }

    /**
     * Test endpoint for smoke testing
     * @returns Test result
     */
    @Post('health')
    @HttpCode(HttpStatus.OK)
    async adminTest(): Promise<{ status: string; message: string }> {
        return {
            status: 'success',
            message: 'Time slots API is working correctly',
        };
    }
} 