import { Entity } from "./Entity.js";
export class AggregateRoot extends Entity {
    pendingEvents = [];
    versionValue = 0;
    addDomainEvent(event) {
        this.pendingEvents.push(event);
    }
    pullDomainEvents() {
        const events = [...this.pendingEvents];
        this.pendingEvents.length = 0;
        return events;
    }
    get version() {
        return this.versionValue;
    }
    incrementVersion() {
        this.versionValue += 1;
    }
}
//# sourceMappingURL=AggregateRoot.js.map