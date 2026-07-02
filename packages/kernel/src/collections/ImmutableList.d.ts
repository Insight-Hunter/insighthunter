export declare class ImmutableList<T> {
    private readonly items;
    private constructor();
    static empty<T>(): ImmutableList<T>;
    static from<T>(items: ReadonlyArray<T>): ImmutableList<T>;
    add(item: T): ImmutableList<T>;
    remove(predicate: (item: T) => boolean): ImmutableList<T>;
    map<U>(mapper: (item: T) => U): ImmutableList<U>;
    filter(predicate: (item: T) => boolean): ImmutableList<T>;
    toArray(): ReadonlyArray<T>;
    get length(): number;
}
