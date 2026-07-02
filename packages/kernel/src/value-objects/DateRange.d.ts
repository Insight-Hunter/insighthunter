import { ValueObject } from '../domain/ValueObject.js';
export declare class DateRange extends ValueObject<{
    start: Date;
    end: Date;
}> {
    private constructor();
    static create(start: Date, end: Date): DateRange;
    includes(date: Date): boolean;
}
