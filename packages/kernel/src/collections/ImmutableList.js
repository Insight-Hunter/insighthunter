export class ImmutableList {
  items;
  constructor(items) {
    this.items = [...items];
  }
  static empty() {
    return new ImmutableList([]);
  }
  static from(items) {
    return new ImmutableList(items);
  }
  add(item) {
    return new ImmutableList([...this.items, item]);
  }
  remove(predicate) {
    return new ImmutableList(this.items.filter((item) => !predicate(item)));
  }
  map(mapper) {
    return new ImmutableList(this.items.map(mapper));
  }
  filter(predicate) {
    return new ImmutableList(this.items.filter(predicate));
  }
  toArray() {
    return [...this.items];
  }
  get length() {
    return this.items.length;
  }
}
//# sourceMappingURL=ImmutableList.js.map
