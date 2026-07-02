export class ImmutableList<T> {
  private readonly items: ReadonlyArray<T>;

  private constructor(items: ReadonlyArray<T>) {
    this.items = [...items];
  }

  public static empty<T>(): ImmutableList<T> {
    return new ImmutableList<T>([]);
  }

  public static from<T>(items: ReadonlyArray<T>): ImmutableList<T> {
    return new ImmutableList(items);
  }

  public add(item: T): ImmutableList<T> {
    return new ImmutableList([...this.items, item]);
  }

  public remove(predicate: (item: T) => boolean): ImmutableList<T> {
    return new ImmutableList(this.items.filter((item) => !predicate(item)));
  }

  public map<U>(mapper: (item: T) => U): ImmutableList<U> {
    return new ImmutableList(this.items.map(mapper));
  }

  public filter(predicate: (item: T) => boolean): ImmutableList<T> {
    return new ImmutableList(this.items.filter(predicate));
  }

  public toArray(): ReadonlyArray<T> {
    return [...this.items];
  }

  public get length(): number {
    return this.items.length;
  }
}
