import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { TimeSlotsService } from '../services/time-slots.service';
import { GetTimeSlotsDto } from '../dto/get-time-slots.dto';
import { DayTimetable } from '../models/interfaces';

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
    async getTimeSlots(@Body() dto: GetTimeSlotsDto): Promise<DayTimetable[]> {
        return await this.timeSlotsService.getTimeSlots(dto);
    }

    /**
     * Test endpoint for smoke testing
     * @returns Test result
     */
    @Post('admin/test')
    @HttpCode(HttpStatus.OK)
    async adminTest(): Promise<{ status: string; message: string }> {
        return {
            status: 'success',
            message: 'Time slots API is working correctly',
        };
    }
} 