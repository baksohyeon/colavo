import { CustomLoggerService } from '@/core/logger/services/custom-logger.service';
import { GetTimeSlotsDto } from '@/modules/time-slots/dto/get-time-slots.dto';
import { IDayTimetable, IWorkhour } from '@/models/interfaces';
import { Injectable } from '@nestjs/common';
import { IEvent } from '@/models/interfaces';
import { toZonedTime } from 'date-fns-tz';
import {
    TODAY,
    DEFAULT_DAYS,
    DEFAULT_TIMESLOT_INTERVAL,
    MILLISECONDS_IN_DAY
} from '../constants/time-slots.constants';
import { TimezoneUtil } from '../utils/timezone.util';
import { DataLoaderService } from './data-loader.service';
import { WorkingHoursCalculatorService } from './working-hours-calculator.service';
import { TimeslotGeneratorService } from './timeslot-generator.service';


@Injectable()
export class TimeSlotsService {
    constructor(
        private readonly logger: CustomLoggerService,
        private readonly timezoneUtil: TimezoneUtil,
        private readonly dataLoader: DataLoaderService,
        private readonly workingHoursCalculator: WorkingHoursCalculatorService,
        private readonly timeslotGenerator: TimeslotGeneratorService,
    ) {
        this.logger.setContext('TimeSlotsService');
    }
    /**
     * Generate available time slots based on the request parameters
     */
    async getTimeSlots(dto: GetTimeSlotsDto): Promise<IDayTimetable[]> {
        this.logger.debug(
            `get time slots for ${dto.start_day_identifier}, duration: ${dto.service_duration}s, days: ${dto.days || DEFAULT_DAYS}, timezone: ${dto.timezone_identifier}, TODAY is ${TODAY}`
        );

        const {
            start_day_identifier,
            timezone_identifier,
            service_duration,
            days = DEFAULT_DAYS,
            timeslot_interval = DEFAULT_TIMESLOT_INTERVAL,
            is_ignore_schedule = false,
            is_ignore_workhour = false,
        } = dto;

        // Validate timezone identifier
        this.timezoneUtil.validateTimezoneIdentifier(timezone_identifier);

        const dayTimetables: IDayTimetable[] = [];
        const startDate = this.timezoneUtil.parseStartDayIdentifierWithTimezone(start_day_identifier, timezone_identifier);

        this.logger.debug(
            `Parsed start date: ${startDate.toISOString()}, timezone: ${timezone_identifier}`
        );

        // Load data files based on ignore flags
        const events = is_ignore_schedule ? [] : await this.dataLoader.loadEvents();
        const workhours = is_ignore_workhour ? [] : await this.dataLoader.loadWorkhours();

        // Log data loading results
        if (is_ignore_schedule) {
            this.logger.debug('Schedule mode: IGNORE - Skipping events.json loading, all generated timeslots will be available');
        } else {
            this.logger.debug(`Schedule mode: CONSIDER - Loaded ${events.length} events from events.json for conflict checking`);
        }

        if (is_ignore_workhour) {
            this.logger.debug('Work hour mode: IGNORE - Using full day (00:00-23:59) as working period, all days treated as working days');
        } else {
            this.logger.debug(`Work hour mode: CONSIDER - Loaded ${workhours.length} work hour entries for time period calculation`);
        }

        // FIXME: 과제 구현사항을 기준으로 2021년 9월 10일로 처리, 실제 데이터에서는 현재 일자로 변경할 필요 있음
        const todayInTimezone = toZonedTime(TODAY, timezone_identifier);
        const todayDateOnly = new Date(todayInTimezone.getFullYear(), todayInTimezone.getMonth(), todayInTimezone.getDate());
        const todayUTC = this.timezoneUtil.convertFromTimezone(todayDateOnly, timezone_identifier);

        for (let dayIndex = 0; dayIndex < days; dayIndex++) {
            const currentDate = new Date(startDate);
            currentDate.setUTCDate(startDate.getUTCDate() + dayIndex);

            // Calculate day_modifier relative to today
            const dayDifferenceMs = currentDate.getTime() - todayUTC.getTime();
            const dayModifier = Math.round(dayDifferenceMs / MILLISECONDS_IN_DAY);

            const dayTimetable = this.generateDayTimetableWithTimezone(
                currentDate,
                dayModifier,
                timezone_identifier,
                service_duration,
                timeslot_interval,
                events,
                workhours,
                is_ignore_workhour,
            );

            dayTimetables.push(dayTimetable);

            this.logger.debug(
                `getTimeSlots ${dayTimetable.timeslots.length} time slots for day ${dayIndex + 1} (${this.timezoneUtil.formatDateInTimezone(currentDate, timezone_identifier)})`
            );
        }

        const totalSlots = dayTimetables.reduce((sum, day) => sum + day.timeslots.length, 0);
        const daysOff = dayTimetables.filter(day => day.is_day_off).length;

        this.logger.info(
            `Successfully generated time slots: ${totalSlots} slots across ${days} day(s) in ${timezone_identifier} ` +
            `(${daysOff} day(s) off, events.json ${is_ignore_schedule ? 'ignored' : 'considered'}, ` +
            `workhurs.json ${is_ignore_workhour ? 'ignored' : 'considered'})`
        );

        return dayTimetables;
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
        const weekday = this.workingHoursCalculator.getWeekdayUTC(date);

        this.logger.debug(
            `Generating timetable for ${date.toISOString().split('T')[0]} (weekday: ${weekday}, modifier: ${dayModifier}, timezone: ${timezoneIdentifier})`
        );

        // Find work hours for this weekday (even if ignoring, we need it for logging)
        const dayWorkhour = workhours.find(wh => wh.weekday === weekday);
        const isDayOff = dayWorkhour?.is_day_off ?? false;

        // Handle work hour restrictions
        if (isIgnoreWorkhour) {
            this.logger.debug(`Ignoring work hours for ${date.toISOString().split('T')[0]} - treating as full working day (00:00-23:59)`);
        } else {
            if (isDayOff) {
                this.logger.debug(`🛌 Day ${date.toISOString().split('T')[0]} is marked as day off (weekday: ${weekday})`);
                return {
                    start_of_day: startOfDayUTC,
                    day_modifier: dayModifier,
                    is_day_off: true,
                    timeslots: [],
                };
            }

            if (dayWorkhour) {
                const openTime = this.workingHoursCalculator.convertSecondsToTimeString(dayWorkhour.open_interval);
                const closeTime = this.workingHoursCalculator.convertSecondsToTimeString(dayWorkhour.close_interval);
                this.logger.debug(
                    `Work hours for ${date.toISOString().split('T')[0]} (weekday: ${weekday}): ${openTime} - ${closeTime}`
                );
            } else {
                this.logger.debug(`No work hours found for weekday ${weekday}, using default full day`);
            }
        }

        // Determine working hours with timezone consideration
        const { workStartSeconds, workEndSeconds } = this.workingHoursCalculator.calculateWorkingHoursWithTimezone(
            startOfDayUTC,
            dayWorkhour,
            isIgnoreWorkhour,
            timezoneIdentifier
        );

        this.logger.debug(
            `Working hours: ${new Date(workStartSeconds * 1000).toISOString()} to ${new Date(workEndSeconds * 1000).toISOString()}`
        );

        // Generate all possible time slots
        const allTimeslots = this.timeslotGenerator.generateAllTimeslots(
            workStartSeconds,
            workEndSeconds,
            serviceDuration,
            timeslotInterval,
        );

        // Filter out slots that conflict with existing events (timezone-aware)
        const availableTimeslots = this.timeslotGenerator.filterConflictingTimeslotsWithTimezone(
            allTimeslots,
            events,
            timezoneIdentifier
        );

        // Log available timeslots
        this.timeslotGenerator.logAvailableTimeslots(availableTimeslots, date, timezoneIdentifier);

        return {
            start_of_day: startOfDayUTC,
            day_modifier: dayModifier,
            is_day_off: false,
            timeslots: availableTimeslots,
        };
    }


} 