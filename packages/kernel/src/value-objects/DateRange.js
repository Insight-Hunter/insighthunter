import { ValueObject } from '../domain/ValueObject.js';
export class DateRange extends ValueObject {
    constructor(start, end) {
        super({ start, end });
    }
    static create(start, end) {
        if (start > end)
            throw new Error('Start date must be before or equal to end date');
        return new DateRange(start, end);
    }
    includes(date) {
        return date >= this.props.start && date <= this.props.end;
    }
}
//# sourceMappingURL=DateRange.js.map