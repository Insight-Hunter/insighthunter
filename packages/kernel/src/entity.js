export class Entity {
  id;
  props;
  constructor(id, props) {
    this.id = id;
    this.props = props;
  }
  equals(other) {
    return this.id === other.id;
  }
  toJSON() {
    return {
      id: this.id,
      ...this.props,
    };
  }
}
export class AggregateRoot extends Entity {
  events = [];
  record(event) {
    this.events.push(event);
  }
  pullDomainEvents() {
    return this.events.splice(0);
  }
  peekDomainEvents() {
    return this.events;
  }
}
//# sourceMappingURL=entity.js.map
