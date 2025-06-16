/**
 * Request interface for getting available time slots
 */
export interface IGetTimeSlotsRequestDto {
    start_day_identifier: string;
    timezone_identifier: string;
    service_duration: number;
    days?: number;
    timeslot_interval?: number;
    is_ignore_schedule?: boolean;
    is_ignore_workhour?: boolean;
}

/**
 * Response interface representing available time slots for a specific day
 */
export interface IDayTimetable {
    start_of_day: number; // Unix timestamp in seconds
    day_modifier: number;
    is_day_off: boolean;
    timeslots: ITimeslot[];
}

/**
 * Interface representing an available time slot
 */
export interface ITimeslot {
    begin_at: number; // Unix timestamp in seconds
    end_at: number; // Unix timestamp in seconds
}

/**
 * Interface representing an existing event/booking
 */
export interface IEvent {
    created_at: number; // Unix timestamp in seconds
    updated_at: number; // Unix timestamp in seconds
    begin_at: number; // Unix timestamp in seconds
    end_at: number; // Unix timestamp in seconds
}

/**
 * Interface representing work hours configuration for a specific weekday
 */
export interface IWorkhour {
    is_day_off: boolean;
    open_interval: number; // Unix interval in seconds from start of day
    close_interval: number; // Unix interval in seconds from start of day
    weekday: number; // 1-7 (Sun-Sat)
}

/**
 * Response type for the getTimeSlots API
 */
export type GetTimeSlotsResponse = IDayTimetable[]; 