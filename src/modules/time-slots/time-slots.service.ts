import { CustomLoggerService } from '@/core/logger/services/custom-logger.service';
import { GetTimeSlotsDto } from '@/modules/time-slots/dto/get-time-slots.dto';
import { IDayTimetable, IWorkhour, ITimeslot } from '@/models/interfaces';
import { Injectable } from '@nestjs/common';
import { IEvent } from '@/models/interfaces';
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { startOfDay, endOfDay } from 'date-fns';



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

        // Load data files based on ignore flags
        const events = is_ignore_schedule ? [] : await this.loadEvents();
        const workhours = is_ignore_workhour ? [] : await this.loadWorkhours();

        // Log data loading results
        if (is_ignore_schedule) {
            this.logger.debug('Schedule mode: IGNORE - No events loaded for conflict checking');
        } else {
            this.logger.debug(`Schedule mode: CONSIDER - Loaded ${events.length} events for conflict checking`);
        }

        if (is_ignore_workhour) {
            this.logger.debug('Work hour mode: IGNORE - Using full day (00:00-23:59) as working period');
        } else {
            this.logger.debug(`Work hour mode: CONSIDER - Loaded ${workhours.length} work hour entries for time period calculation`);
        }

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



        const totalSlots = dayTimetables.reduce((sum, day) => sum + day.timeslots.length, 0);
        const daysOff = dayTimetables.filter(day => day.is_day_off).length;

        this.logger.info(
            `Successfully generated time slots: ${totalSlots} slots across ${days} day(s) in ${timezone_identifier} ` +
            `(${daysOff} day(s) off, schedule_ignored=${is_ignore_schedule}, workhour_ignored=${is_ignore_workhour})`
        );

        return dayTimetables;
    }

    /**
     * Validate timezone identifier and throw descriptive errors
     */
    private validateTimezoneIdentifier(timezoneId: string): void {
        if (!timezoneId || typeof timezoneId !== 'string') {
            throw new Error('Invalid timezone identifier: must be a non-empty string');
        }

        if (timezoneId.trim().length === 0) {
            throw new Error('Invalid timezone identifier: cannot be empty or whitespace only');
        }

        // Validate using date-fns-tz
        if (!this.isValidTimezoneIdentifier(timezoneId)) {
            throw new Error(
                `Invalid timezone identifier: '${timezoneId}'. ` +
                'Please use a valid IANA timezone identifier (e.g., "UTC", "Asia/Seoul", "America/New_York")'
            );
        }

        this.logger.debug(`Timezone identifier validation passed: ${timezoneId}`);
    }

    /**
     * Check if timezone identifier is valid using date-fns-tz
     * Validates by attempting timezone conversion and handles errors gracefully
     */
    private isValidTimezoneIdentifier(timezoneId: string): boolean {
        // Basic format validation first
        if (!timezoneId || typeof timezoneId !== 'string' || timezoneId.trim().length === 0) {
            this.logger.debug(`Invalid timezone identifier format: empty or non-string value`);
            return false;
        }

        try {
            // Try to create a date in the specified timezone
            // This will throw if the timezone identifier is invalid


            const testDate = new Date(); // Use a fixed date for consistent testing

            testDate.setMinutes(0, 0, 0);

            const zonedDate = toZonedTime(testDate, timezoneId);

            // Additional validation: ensure the conversion actually worked
            if (!zonedDate || !(zonedDate instanceof Date) || isNaN(zonedDate.getTime())) {
                this.logger.debug(`Timezone conversion failed for: ${timezoneId} - invalid result`);
                return false;
            }

            this.logger.debug(`Timezone identifier validated successfully: ${timezoneId}`);
            return true;
        } catch (error) {
            // Handle different types of errors gracefully
            if (error instanceof Error) {
                this.logger.debug(
                    `Invalid timezone identifier: ${timezoneId} - ${error.name}: ${error.message}`
                );
            } else {
                this.logger.debug(
                    `Invalid timezone identifier: ${timezoneId} - Unknown error: ${String(error)}`
                );
            }
            return false;
        }
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

        // Create date representing the date in the specified timezone at 00:00:00
        // We interpret the date identifier as a date in the specified timezone
        const dateInTimezone = new Date(year, month, day, 0, 0, 0, 0);

        // Convert the timezone-specific date to UTC
        const utcDate = fromZonedTime(dateInTimezone, timezoneId);

        this.logger.debug(
            `Parsed date ${identifier} in timezone ${timezoneId}: interpreted as ${dateInTimezone.toISOString()} in ${timezoneId}, converted to UTC: ${utcDate.toISOString()}`
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

        // Find work hours for this weekday (even if ignoring, we need it for logging)
        const dayWorkhour = workhours.find(wh => wh.weekday === weekday);
        const isDayOff = dayWorkhour?.is_day_off ?? false;

        // Handle work hour restrictions
        if (isIgnoreWorkhour) {
            // When ignoring work hours, treat every day as a working day with full 24-hour availability
            this.logger.debug(`Ignoring work hours for ${date.toISOString().split('T')[0]} - treating as full working day`);
        } else {
            if (isDayOff) {
                this.logger.debug(`Day ${date.toISOString().split('T')[0]} is marked as day off (weekday: ${weekday})`);
                return {
                    start_of_day: startOfDayUTC,
                    day_modifier: dayModifier,
                    is_day_off: true,
                    timeslots: [],
                };
            }

            if (dayWorkhour) {
                const openTime = this.convertSecondsToTimeString(dayWorkhour.open_interval);
                const closeTime = this.convertSecondsToTimeString(dayWorkhour.close_interval);
                this.logger.debug(
                    `Work hours for ${date.toISOString().split('T')[0]} (weekday: ${weekday}): ${openTime} - ${closeTime}`
                );
            } else {
                this.logger.debug(`No work hours found for weekday ${weekday}, using default full day`);
            }
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
                const durationMinutes = Math.round((slot.end_at - slot.begin_at) / 60); // Convert seconds to minutes
                this.logger.verbose(`  ${index + 1}. ${beginTime.slice(11, 19)} → ${endTime.slice(11, 19)} (${durationMinutes}min) [${slot.begin_at}-${slot.end_at}]`);
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
            this.logger.debug(
                `Using full day schedule: 00:00 - 23:59 (${isIgnoreWorkhour ? 'work hours ignored' : 'no work hours data'})`
            );
            return {
                workStartSeconds: startOfDayUTC,
                workEndSeconds: startOfDayUTC + (24 * 60 * 60) - 1,
            };
        }

        // Convert UTC start of day to the specified timezone
        const utcStartOfDay = new Date(startOfDayUTC * 1000);
        const zonedStartOfDay = toZonedTime(utcStartOfDay, timezoneIdentifier);

        // Apply work hour intervals to the timezone-aware start of day
        const workStartInTimezone = new Date(zonedStartOfDay.getTime() + dayWorkhour.open_interval * 1000);
        const workEndInTimezone = new Date(zonedStartOfDay.getTime() + dayWorkhour.close_interval * 1000);

        // Convert back to UTC timestamps
        const workStartUTC = fromZonedTime(workStartInTimezone, timezoneIdentifier);
        const workEndUTC = fromZonedTime(workEndInTimezone, timezoneIdentifier);

        const workStartSeconds = Math.floor(workStartUTC.getTime() / 1000);
        const workEndSeconds = Math.floor(workEndUTC.getTime() / 1000);

        try {
            const workStartFormatted = format(workStartInTimezone, 'HH:mm', { timeZone: timezoneIdentifier });
            const workEndFormatted = format(workEndInTimezone, 'HH:mm', { timeZone: timezoneIdentifier });

            this.logger.debug(
                `Applied work hours for ${timezoneIdentifier}: ` +
                `open_interval=${dayWorkhour.open_interval}s (${workStartFormatted}), ` +
                `close_interval=${dayWorkhour.close_interval}s (${workEndFormatted})`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.debug(
                `Applied work hours for ${timezoneIdentifier} (timezone formatting failed: ${errorMessage}): ` +
                `open_interval=${dayWorkhour.open_interval}s, close_interval=${dayWorkhour.close_interval}s`
            );
        }

        return { workStartSeconds, workEndSeconds };
    }

    /**
     * Get weekday number (1-7, Sun-Sat) from UTC date
     */
    private getWeekdayUTC(date: Date): number {
        return date.getUTCDay() + 1; // JavaScript getUTCDay() returns 0-6, we need 1-7
    }

    /**
     * Convert seconds from start of day to HH:MM format
     */
    private convertSecondsToTimeString(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    /**
     * Format date in specified timezone using date-fns-tz
     */
    private formatDateInTimezone(date: Date, timezoneId: string): string {
        try {
            const zonedDate = toZonedTime(date, timezoneId);
            return format(zonedDate, 'yyyy-MM-dd', { timeZone: timezoneId });
        } catch (error) {
            const errorMessage = error instanceof Error ?
                `${error.name}: ${error.message}` :
                String(error);

            this.logger.warn(
                `Failed to format date ${date.toISOString()} in timezone ${timezoneId}: ${errorMessage}. ` +
                'Falling back to UTC format'
            );

            return date.toISOString().split('T')[0];
        }
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
            this.logger.debug(
                `No events to check for conflicts - returning all ${timeslots.length} generated timeslots ` +
                `(schedule ${events.length === 0 ? 'ignored or empty' : 'loaded'})`
            );
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
        // Both slot and event times are assumed to be in UTC seconds
        // The timezone is used for logging purposes and future enhancements
        const conflict = !(slot.end_at <= event.begin_at || slot.begin_at >= event.end_at);

        if (conflict) {
            const slotStart = new Date(slot.begin_at * 1000);
            const slotEnd = new Date(slot.end_at * 1000);
            const eventStart = new Date(event.begin_at * 1000);
            const eventEnd = new Date(event.end_at * 1000);

            try {
                // Convert to timezone-aware format for logging
                const slotStartFormatted = format(toZonedTime(slotStart, timezoneIdentifier), 'HH:mm', { timeZone: timezoneIdentifier });
                const slotEndFormatted = format(toZonedTime(slotEnd, timezoneIdentifier), 'HH:mm', { timeZone: timezoneIdentifier });
                const eventStartFormatted = format(toZonedTime(eventStart, timezoneIdentifier), 'HH:mm', { timeZone: timezoneIdentifier });
                const eventEndFormatted = format(toZonedTime(eventEnd, timezoneIdentifier), 'HH:mm', { timeZone: timezoneIdentifier });

                this.logger.debug(
                    `Time conflict detected in ${timezoneIdentifier}: ` +
                    `slot(${slotStartFormatted}-${slotEndFormatted}) vs event(${eventStartFormatted}-${eventEndFormatted})`
                );
            } catch (error) {
                // Fallback to UTC format if timezone formatting fails
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.debug(
                    `Time conflict detected (timezone formatting failed: ${errorMessage}): ` +
                    `slot(${slotStart.toISOString()}-${slotEnd.toISOString()}) vs event(${eventStart.toISOString()}-${eventEnd.toISOString()})`
                );
            }
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