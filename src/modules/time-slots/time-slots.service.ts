import { CustomLoggerService } from '@/core/logger/services/custom-logger.service';
import { GetTimeSlotsDto } from '@/modules/time-slots/dto/get-time-slots.dto';
import { IDayTimetable, IWorkhour, ITimeslot } from '@/models/interfaces';
import { Injectable } from '@nestjs/common';
import { IEvent } from '@/models/interfaces';



@Injectable()
export class TimeSlotsService {
    constructor(private readonly logger: CustomLoggerService) {
        this.logger.setContext('TimeSlotsService');
    }
    /**
     * Generate available time slots based on the request parameters
     */
    async getTimeSlots(dto: GetTimeSlotsDto): Promise<IDayTimetable[]> {
        this.logger.info(
            `get time slots for ${dto.start_day_identifier}, duration: ${dto.service_duration}s, days: ${dto.days || 1}, timezone: ${dto.timezone_identifier}`
        );

        const {
            start_day_identifier,
            timezone_identifier,
            service_duration,
            days = 1,
            timeslot_interval = 1800,
            is_ignore_schedule = false,
            is_ignore_workhour = false,
        } = dto;

        // Validate timezone identifier
        this.validateTimezoneIdentifier(timezone_identifier);

        const dayTimetables: IDayTimetable[] = [];
        const startDate = this.parseStartDayIdentifierWithTimezone(start_day_identifier, timezone_identifier);

        this.logger.debug(
            `Parsed start date: ${startDate.toISOString()}, timezone: ${timezone_identifier}`
        );

        // Load data files if needed
        const events = is_ignore_schedule ? [] : await this.loadEvents();
        const workhours = is_ignore_workhour ? [] : await this.loadWorkhours();

        this.logger.debug(
            `Loaded ${events.length} events and ${workhours.length} work hour entries`
        );

        for (let dayIndex = 0; dayIndex < days; dayIndex++) {
            const currentDate = new Date(startDate);
            currentDate.setUTCDate(startDate.getUTCDate() + dayIndex);

            const dayTimetable = this.generateDayTimetableWithTimezone(
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

            this.logger.debug(
                `getTimeSlots ${dayTimetable.timeslots.length} time slots for day ${dayIndex + 1} (${this.formatDateInTimezone(currentDate, timezone_identifier)})`
            );
        }



        this.logger.info(`Successfully getTimeSlots for ${days} day(s) in ${timezone_identifier}`);
        return dayTimetables;
    }

    /**
     * Validate timezone identifier format
     */
    private validateTimezoneIdentifier(timezoneId: string): void {
        if (!timezoneId || typeof timezoneId !== 'string') {
            throw new Error('Invalid timezone identifier: must be a non-empty string');
        }

        // Basic validation for IANA timezone format
        if (!this.isValidTimezoneIdentifier(timezoneId)) {
            this.logger.warn(`Potentially invalid timezone identifier: ${timezoneId}`);
        }
    }

    /**
     * Check if timezone identifier follows IANA format
     */
    private isValidTimezoneIdentifier(timezoneId: string): boolean {
        // Common patterns for valid timezone identifiers
        const validPatterns = [
            /^UTC$/,
            /^[A-Z][a-z]+\/[A-Za-z_]+$/,  // Continent/City
            /^[A-Z][a-z]+\/[A-Za-z_]+\/[A-Za-z_]+$/, // Continent/Country/City
        ];

        return validPatterns.some(pattern => pattern.test(timezoneId));
    }

    /**
     * Parse start_day_identifier string to Date object considering timezone
     */
    private parseStartDayIdentifierWithTimezone(identifier: string, timezoneId: string): Date {
        if (!identifier || identifier.length !== 8) {
            throw new Error(`Invalid start_day_identifier format: ${identifier}. Expected YYYYMMDD format.`);
        }

        const year = parseInt(identifier.substring(0, 4));
        const month = parseInt(identifier.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(identifier.substring(6, 8));

        if (isNaN(year) || isNaN(month) || isNaN(day)) {
            throw new Error(`Invalid date components in start_day_identifier: ${identifier}`);
        }

        // Create date in the specified timezone at 00:00:00
        // For now, we'll create UTC date and document the timezone intent
        // In a production system, you'd use a library like date-fns-tz or moment-timezone
        const utcDate = new Date(Date.UTC(year, month, day));

        this.logger.debug(
            `Parsed date ${identifier} as ${utcDate.toISOString()} (treating as ${timezoneId} local date)`
        );

        return utcDate;
    }

    /**
     * Generate timetable for a specific day with timezone consideration
     */
    private generateDayTimetableWithTimezone(
        date: Date,
        dayModifier: number,
        timezoneIdentifier: string,
        serviceDuration: number,
        timeslotInterval: number,
        events: IEvent[],
        workhours: IWorkhour[],
        isIgnoreWorkhour: boolean,
    ): IDayTimetable {
        const startOfDayUTC = Math.floor(date.getTime() / 1000);
        const weekday = this.getWeekdayUTC(date);

        this.logger.debug(
            `Generating timetable for ${date.toISOString().split('T')[0]} (weekday: ${weekday}, modifier: ${dayModifier}, timezone: ${timezoneIdentifier})`
        );

        // Find work hours for this weekday
        const dayWorkhour = workhours.find(wh => wh.weekday === weekday);
        const isDayOff = dayWorkhour?.is_day_off ?? false;

        if (isDayOff && !isIgnoreWorkhour) {
            this.logger.debug(`Day ${date.toISOString().split('T')[0]} is marked as day off`);
            return {
                start_of_day: startOfDayUTC,
                day_modifier: dayModifier,
                is_day_off: true,
                timeslots: [],
            };
        }

        // Determine working hours with timezone consideration
        const { workStartSeconds, workEndSeconds } = this.calculateWorkingHoursWithTimezone(
            startOfDayUTC,
            dayWorkhour,
            isIgnoreWorkhour,
            timezoneIdentifier
        );

        this.logger.debug(
            `Working hours: ${new Date(workStartSeconds * 1000).toISOString()} to ${new Date(workEndSeconds * 1000).toISOString()}`
        );

        // Generate all possible time slots
        const allTimeslots = this.generateAllTimeslots(
            workStartSeconds,
            workEndSeconds,
            serviceDuration,
            timeslotInterval,
        );

        // Filter out slots that conflict with existing events (timezone-aware)
        const availableTimeslots = this.filterConflictingTimeslotsWithTimezone(
            allTimeslots,
            events,
            timezoneIdentifier
        );

        // Debug log with human-readable timestamps
        if (availableTimeslots.length > 0) {
            this.logger.verbose(`Available timeslots for ${this.formatDateInTimezone(date, timezoneIdentifier)}:`);
            availableTimeslots.forEach((slot, index) => {
                const beginTime = new Date(slot.begin_at * 1000).toISOString();
                const endTime = new Date(slot.end_at * 1000).toISOString();
                const duration = (slot.end_at - slot.begin_at) / 60; // minutes
                this.logger.verbose(`  ${index + 1}. ${beginTime.slice(11, 19)} → ${endTime.slice(11, 19)} (${duration}min) [${slot.begin_at}-${slot.end_at}]`);
            });
        } else {
            this.logger.debug(`No available timeslots for ${this.formatDateInTimezone(date, timezoneIdentifier)}`);
        }

        return {
            start_of_day: startOfDayUTC,
            day_modifier: dayModifier,
            is_day_off: false,
            timeslots: availableTimeslots,
        };
    }

    /**
     * Calculate working hours considering timezone
     */
    private calculateWorkingHoursWithTimezone(
        startOfDayUTC: number,
        dayWorkhour: IWorkhour | undefined,
        isIgnoreWorkhour: boolean,
        timezoneIdentifier: string
    ): { workStartSeconds: number; workEndSeconds: number } {
        if (isIgnoreWorkhour || !dayWorkhour) {
            // Use full day (00:00 to 23:59:59)
            return {
                workStartSeconds: startOfDayUTC,
                workEndSeconds: startOfDayUTC + (24 * 60 * 60) - 1,
            };
        }

        // Apply timezone offset to work hours
        // Note: In a real implementation, you'd calculate actual timezone offset
        // For now, we'll apply the intervals directly (assuming they're in local timezone)
        const workStartSeconds = startOfDayUTC + dayWorkhour.open_interval;
        const workEndSeconds = startOfDayUTC + dayWorkhour.close_interval;

        this.logger.debug(
            `Applied work hours for ${timezoneIdentifier}: open_interval=${dayWorkhour.open_interval}s, close_interval=${dayWorkhour.close_interval}s`
        );

        return { workStartSeconds, workEndSeconds };
    }

    /**
     * Get weekday number (1-7, Sun-Sat) from UTC date
     */
    private getWeekdayUTC(date: Date): number {
        return date.getUTCDay() + 1; // JavaScript getUTCDay() returns 0-6, we need 1-7
    }

    /**
     * Format date in specified timezone (placeholder implementation)
     */
    private formatDateInTimezone(date: Date, timezoneId: string): string {
        // In a real implementation, you'd use a proper timezone library
        // For now, return ISO string with timezone info
        return `${date.toISOString().split('T')[0]} (${timezoneId})`;
    }

    /**
     * Generate all possible time slots within working hours
     */
    private generateAllTimeslots(
        startSeconds: number,
        endSeconds: number,
        serviceDuration: number,
        interval: number,
    ): ITimeslot[] {
        const timeslots: ITimeslot[] = [];

        for (let current = startSeconds; current + serviceDuration <= endSeconds; current += interval) {
            timeslots.push({
                begin_at: current,
                end_at: current + serviceDuration,
            });
        }

        this.logger.debug(
            `Generated ${timeslots.length} potential timeslots from ${new Date(startSeconds * 1000).toISOString()} to ${new Date(endSeconds * 1000).toISOString()}`
        );

        return timeslots;
    }

    /**
     * Filter out time slots that conflict with existing events (timezone-aware)
     */
    private filterConflictingTimeslotsWithTimezone(
        timeslots: ITimeslot[],
        events: IEvent[],
        timezoneIdentifier: string
    ): ITimeslot[] {
        if (events.length === 0) {
            return timeslots;
        }

        // Convert events to the working timezone if needed
        // For now, assume events are already in UTC
        const conflictingSlots = timeslots.filter(slot => {
            const hasConflict = events.some(event => this.hasTimeConflictWithTimezone(slot, event, timezoneIdentifier));
            if (hasConflict) {
                this.logger.debug(
                    `Slot ${new Date(slot.begin_at * 1000).toISOString()}-${new Date(slot.end_at * 1000).toISOString()} conflicts with existing event`
                );
            }
            return !hasConflict;
        });

        this.logger.debug(
            `Filtered ${timeslots.length - conflictingSlots.length} conflicting slots, ${conflictingSlots.length} available`
        );

        return conflictingSlots;
    }

    /**
     * Check if a time slot conflicts with an event (timezone-aware)
     */
    private hasTimeConflictWithTimezone(slot: ITimeslot, event: IEvent, timezoneIdentifier: string): boolean {
        // For now, assume both slot and event times are in UTC
        // In a full implementation, you'd convert event times to the working timezone
        const conflict = !(slot.end_at <= event.begin_at || slot.begin_at >= event.end_at);

        if (conflict) {
            this.logger.debug(
                `Time conflict detected in ${timezoneIdentifier}: slot(${slot.begin_at}-${slot.end_at}) vs event(${event.begin_at}-${event.end_at})`
            );
        }

        return conflict;
    }

    /**
     * Load events data from JSON file
     */
    private async loadEvents(): Promise<IEvent[]> {
        try {
            this.logger.debug('Loading events data from JSON file');
            const fs = await import('fs/promises');
            const path = await import('path');
            const filePath = path.join(process.cwd(), 'src', 'data', 'events.json');
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const events = JSON.parse(fileContent) as IEvent[];
            this.logger.debug(`Successfully loaded ${events.length} events`);
            return events;
        } catch (error) {
            this.logger.error(
                'Error loading events data',
                error instanceof Error ? error.stack : String(error)
            );
            return [];
        }
    }

    /**
     * Load work hours data from JSON file
     */
    private async loadWorkhours(): Promise<IWorkhour[]> {
        try {
            this.logger.debug('Loading work hours data from JSON file');
            const fs = await import('fs/promises');
            const path = await import('path');
            const filePath = path.join(process.cwd(), 'src', 'data', 'workhours.json');
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const workhours = JSON.parse(fileContent) as IWorkhour[];
            this.logger.debug(`Successfully loaded ${workhours.length} work hour entries`);
            return workhours;
        } catch (error) {
            this.logger.error(
                'Error loading work hours data',
                error instanceof Error ? error.stack : String(error)
            );
            return [];
        }
    }
} 