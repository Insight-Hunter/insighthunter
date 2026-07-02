export declare class UniqueId {
    protected readonly raw: string;
    protected constructor(value?: string);
    static create(value?: string): UniqueId;
    toString(): string;
    equals(other: UniqueId): boolean;
}
