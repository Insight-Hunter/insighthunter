import { ValueObject } from '../domain/ValueObject.js';
export declare class Currency extends ValueObject<{
    code: string;
}> {
    private constructor();
    static create(code: string): Currency;
    get code(): string;
}
