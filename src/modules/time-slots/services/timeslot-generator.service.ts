import { CustomLoggerService } from '@/core/logger/services/custom-logger.service';
import { IEvent, ITimeslot } from '@/models/interfaces';
import { Injectable } from '@nestjs/common';
import { TimezoneUtil } from '../utils/timezone.util';
import { format } from 'date-fns-tz';

/**
 * Service responsible for generating and filtering timeslots
 */
@Injectable()
export class TimeslotGeneratorService {
    constructor(
        private readonly logger: CustomLoggerService,
        private readonly timezoneUtil: TimezoneUtil,
    ) {
        this.logger.setContext('TimeslotGeneratorService');
    }

    /**
     * Generate all possible time slots within working hours
     */
    generateAllTimeslots(
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
    filterConflictingTimeslotsWithTimezone(
        timeslots: ITimeslot[],
        events: IEvent[],
        timezoneIdentifier: string
    ): ITimeslot[] {
        if (events.length === 0) {
            this.logger.debug(
                `No events to check for conflicts - returning all ${timeslots.length} generated timeslots ` +
                `(schedule ignored: events.json not loaded)`
            );
            return timeslots;
        }

        const availableSlots = timeslots.filter(slot => {
            const hasConflict = events.some(event =>
                this.hasTimeConflictWithTimezone(slot, event, timezoneIdentifier)
            );
            return !hasConflict;
        });

        this.logger.debug(
            `Filtered ${timeslots.length - availableSlots.length} conflicting slots, ${availableSlots.length} available`
        );

        return availableSlots;
    }

    /**
     * Log available timeslots in a human-readable format
     */
    logAvailableTimeslots(timeslots: ITimeslot[], date: Date, timezoneIdentifier: string): void {
        if (timeslots.length === 0) {
            this.logger.debug(`No available timeslots for ${this.timezoneUtil.formatDateInTimezone(date, timezoneIdentifier)}`);
            return;
        }

        this.logger.verbose(`Available timeslots for ${this.timezoneUtil.formatDateInTimezone(date, timezoneIdentifier)} (${timezoneIdentifier}):`);

        const slotsByLocalDate = this.groupSlotsByLocalDate(timeslots, timezoneIdentifier);
        this.logGroupedSlots(slotsByLocalDate, timezoneIdentifier);

        this.logger.verbose(`Total: ${timeslots.length} available slots`);
    }

    /**
     * Check if a time slot conflicts with an event (timezone-aware)
     */
    private hasTimeConflictWithTimezone(slot: ITimeslot, event: IEvent, timezoneIdentifier: string): boolean {
        const conflict = !(slot.end_at <= event.begin_at || slot.begin_at >= event.end_at);

        if (conflict) {
            this.logTimeConflict(slot, event, timezoneIdentifier);
        }

        return conflict;
    }

    /**
     * Group timeslots by local date for better logging
     */
    private groupSlotsByLocalDate(timeslots: ITimeslot[], timezoneIdentifier: string): Map<string, ITimeslot[]> {
        const slotsByLocalDate = new Map<string, ITimeslot[]>();

        timeslots.forEach((slot) => {
            try {
                const slotStartUTC = new Date(slot.begin_at * 1000);
                const slotStartLocal = this.timezoneUtil.convertToTimezone(slotStartUTC, timezoneIdentifier);
                const localDateKey = format(slotStartLocal, 'yyyy-MM-dd', { timeZone: timezoneIdentifier });

                if (!slotsByLocalDate.has(localDateKey)) {
                    slotsByLocalDate.set(localDateKey, []);
                }
                slotsByLocalDate.get(localDateKey)!.push(slot);
            } catch (error) {
                const utcDate = new Date(slot.begin_at * 1000).toISOString().split('T')[0];
                if (!slotsByLocalDate.has(utcDate)) {
                    slotsByLocalDate.set(utcDate, []);
                }
                slotsByLocalDate.get(utcDate)!.push(slot);
            }
        });

        return slotsByLocalDate;
    }

    /**
     * Log grouped slots with proper formatting
     */
    private logGroupedSlots(slotsByLocalDate: Map<string, ITimeslot[]>, timezoneIdentifier: string): void {
        let totalSlotIndex = 0;

        slotsByLocalDate.forEach((slots, dateKey) => {
            if (slotsByLocalDate.size > 1) {
                this.logger.verbose(`${dateKey}:`);
            }

            slots.forEach((slot) => {
                totalSlotIndex++;
                this.logIndividualSlot(slot, totalSlotIndex, timezoneIdentifier, slotsByLocalDate.size > 1);
            });
        });
    }

    /**
     * Log individual slot with timezone information
     */
    private logIndividualSlot(slot: ITimeslot, index: number, timezoneIdentifier: string, isGrouped: boolean): void {
        try {
            const slotStartUTC = new Date(slot.begin_at * 1000);
            const slotEndUTC = new Date(slot.end_at * 1000);
            const slotStartLocal = this.timezoneUtil.convertToTimezone(slotStartUTC, timezoneIdentifier);
            const slotEndLocal = this.timezoneUtil.convertToTimezone(slotEndUTC, timezoneIdentifier);

            const startTimeLocal = this.timezoneUtil.formatTimeInTimezone(slotStartLocal, timezoneIdentifier);
            const endTimeLocal = this.timezoneUtil.formatTimeInTimezone(slotEndLocal, timezoneIdentifier);
            const durationMinutes = Math.round((slot.end_at - slot.begin_at) / 60);

            const prefix = isGrouped ? '     ' : '   ';

            this.logger.verbose(
                `${prefix}${index.toString().padStart(2)}.` +
                ` ${startTimeLocal} → ${endTimeLocal} (${durationMinutes}min)` +
                ` [UTC: ${slotStartUTC.toISOString().slice(11, 19)} → ${slotEndUTC.toISOString().slice(11, 19)}]`
            );
        } catch (error) {
            this.logSlotFallback(slot, index, isGrouped);
        }
    }

    /**
     * Fallback logging for slots when timezone formatting fails
     */
    private logSlotFallback(slot: ITimeslot, index: number, isGrouped: boolean): void {
        const startTimeUTC = new Date(slot.begin_at * 1000).toISOString().slice(11, 19);
        const endTimeUTC = new Date(slot.end_at * 1000).toISOString().slice(11, 19);
        const durationMinutes = Math.round((slot.end_at - slot.begin_at) / 60);

        const prefix = isGrouped ? '     ' : '   ';
        this.logger.verbose(
            `${prefix}${index.toString().padStart(2)}.` +
            ` ${startTimeUTC} → ${endTimeUTC} (${durationMinutes}min) [UTC] ` +
            `[${slot.begin_at}-${slot.end_at}]`
        );
    }

    /**
     * Log time conflict details
     */
    private logTimeConflict(slot: ITimeslot, event: IEvent, timezoneIdentifier: string): void {
        const slotStart = new Date(slot.begin_at * 1000);
        const slotEnd = new Date(slot.end_at * 1000);
        const eventStart = new Date(event.begin_at * 1000);
        const eventEnd = new Date(event.end_at * 1000);

        try {
            const slotStartFormatted = this.timezoneUtil.formatTimeInTimezone(slotStart, timezoneIdentifier);
            const slotEndFormatted = this.timezoneUtil.formatTimeInTimezone(slotEnd, timezoneIdentifier);
            const eventStartFormatted = this.timezoneUtil.formatTimeInTimezone(eventStart, timezoneIdentifier);
            const eventEndFormatted = this.timezoneUtil.formatTimeInTimezone(eventEnd, timezoneIdentifier);

            this.logger.debug(
                `Time conflict detected in ${timezoneIdentifier}: ` +
                `slot(${slotStartFormatted}-${slotEndFormatted}) vs event(${eventStartFormatted}-${eventEndFormatted})`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.debug(
                `Time conflict detected (timezone formatting failed: ${errorMessage}): ` +
                `slot(${slotStart.toISOString()}-${slotEnd.toISOString()}) vs event(${eventStart.toISOString()}-${eventEnd.toISOString()})`
            );
        }
    }
} 