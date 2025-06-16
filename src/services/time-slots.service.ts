import { Injectable } from '@nestjs/common';
import { GetTimeSlotsDto } from '../dto/get-time-slots.dto';
import { DayTimetable, Timeslot, Event, Workhour } from '../models/interfaces';

@Injectable()
export class TimeSlotsService {
    /**
     * Generate available time slots based on the request parameters
     */
    async getTimeSlots(dto: GetTimeSlotsDto): Promise<DayTimetable[]> {
        const {
            start_day_identifier,
            timezone_identifier,
            service_duration,
            days = 1,
            timeslot_interval = 1800,
            is_ignore_schedule = false,
            is_ignore_workhour = false,
        } = dto;

        const dayTimetables: DayTimetable[] = [];
        const startDate = this.parseStartDayIdentifier(start_day_identifier);

        // Load data files if needed
        const events = is_ignore_schedule ? [] : await this.loadEvents();
        const workhours = is_ignore_workhour ? [] : await this.loadWorkhours();

        for (let dayIndex = 0; dayIndex < days; dayIndex++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + dayIndex);

            const dayTimetable = this.generateDayTimetable(
                currentDate,
                dayIndex,
                timezone_identifier,
                service_duration,
                timeslot_interval,
                events,
                workhours,
                is_ignore_workhour,
            );

            dayTimetables.push(dayTimetable);
        }

        return dayTimetables;
    }

    /**
     * Parse start_day_identifier string to Date object
     */
    private parseStartDayIdentifier(identifier: string): Date {
        const year = parseInt(identifier.substring(0, 4));
        const month = parseInt(identifier.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(identifier.substring(6, 8));
        return new Date(year, month, day);
    }

    /**
     * Generate timetable for a specific day
     */
    private generateDayTimetable(
        date: Date,
        dayModifier: number,
        timezoneIdentifier: string,
        serviceDuration: number,
        timeslotInterval: number,
        events: Event[],
        workhours: Workhour[],
        isIgnoreWorkhour: boolean,
    ): DayTimetable {
        const startOfDay = Math.floor(date.getTime() / 1000);
        const weekday = this.getWeekday(date);

        // Find work hours for this weekday
        const dayWorkhour = workhours.find(wh => wh.weekday === weekday);
        const isDayOff = dayWorkhour?.is_day_off ?? false;

        if (isDayOff && !isIgnoreWorkhour) {
            return {
                start_of_day: startOfDay,
                day_modifier: dayModifier,
                is_day_off: true,
                timeslots: [],
            };
        }

        // Determine working hours
        let workStartSeconds: number;
        let workEndSeconds: number;

        if (isIgnoreWorkhour || !dayWorkhour) {
            // Use full day (00:00 to 23:59)
            workStartSeconds = startOfDay;
            workEndSeconds = startOfDay + (24 * 60 * 60) - 1;
        } else {
            workStartSeconds = startOfDay + dayWorkhour.open_interval;
            workEndSeconds = startOfDay + dayWorkhour.close_interval;
        }

        // Generate all possible time slots
        const allTimeslots = this.generateAllTimeslots(
            workStartSeconds,
            workEndSeconds,
            serviceDuration,
            timeslotInterval,
        );

        // Filter out slots that conflict with existing events
        const availableTimeslots = this.filterConflictingTimeslots(allTimeslots, events);

        return {
            start_of_day: startOfDay,
            day_modifier: dayModifier,
            is_day_off: false,
            timeslots: availableTimeslots,
        };
    }

    /**
     * Get weekday number (1-7, Sun-Sat)
     */
    private getWeekday(date: Date): number {
        return date.getDay() + 1; // JavaScript getDay() returns 0-6, we need 1-7
    }

    /**
     * Generate all possible time slots within working hours
     */
    private generateAllTimeslots(
        startSeconds: number,
        endSeconds: number,
        serviceDuration: number,
        interval: number,
    ): Timeslot[] {
        const timeslots: Timeslot[] = [];

        for (let current = startSeconds; current + serviceDuration <= endSeconds; current += interval) {
            timeslots.push({
                begin_at: current,
                end_at: current + serviceDuration,
            });
        }

        return timeslots;
    }

    /**
     * Filter out time slots that conflict with existing events
     */
    private filterConflictingTimeslots(timeslots: Timeslot[], events: Event[]): Timeslot[] {
        return timeslots.filter(slot => {
            return !events.some(event => this.hasTimeConflict(slot, event));
        });
    }

    /**
     * Check if a time slot conflicts with an event
     */
    private hasTimeConflict(slot: Timeslot, event: Event): boolean {
        return !(slot.end_at <= event.begin_at || slot.begin_at >= event.end_at);
    }

    /**
 * Load events data from JSON file
 */
    private async loadEvents(): Promise<Event[]> {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const filePath = path.join(process.cwd(), 'src', 'data', 'events.json');
            const fileContent = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(fileContent) as Event[];
        } catch (error) {
            console.error('Error loading events:', error);
            return [];
        }
    }

    /**
     * Load work hours data from JSON file
     */
    private async loadWorkhours(): Promise<Workhour[]> {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const filePath = path.join(process.cwd(), 'src', 'data', 'workhours.json');
            const fileContent = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(fileContent) as Workhour[];
        } catch (error) {
            console.error('Error loading work hours:', error);
            return [];
        }
    }
} 