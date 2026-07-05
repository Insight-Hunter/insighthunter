// core
export { AggregateRoot } from "./core/aggregate-root.js";
export { SystemClock } from "./core/clock.js";
export type { Clock } from "./core/clock.js";
export type { DomainEvent } from "./core/domain-event.js";
export { DomainError } from "./core/domain-error.js";
export { EntityId } from "./core/entity-id.js";
export { Result } from "./core/result.js";
export { ValueObject } from "./core/value-object.js";

// domain
export { AggregateRoot as AggregateRootBase } from "./domain/AggregateRoot.js";
export { Entity } from "./domain/Entity.js";
export type { Policy } from "./domain/Policy.js";
export type { Specification } from "./domain/Specification.js";
export { AbstractSpecification, AdHocSpecification } from "./domain/Specification.js";
export { ValueObject as ValueObjectBase } from "./domain/ValueObject.js";

// identity
export { TypedId } from "./identity/TypedId.js";
export type { TypedIdValue } from "./identity/TypedId.js";
export { UniqueId } from "./identity/UniqueId.js";

// primitives
export { Guard } from "./primitives/Guard.js";
export { Maybe } from "./primitives/Maybe.js";
export { Result as ResultV2 } from "./primitives/Result.js";

// events
export type { DomainEvent as DomainEventV2 } from "./events/DomainEvent.js";
export { DomainEventBus } from "./events/DomainEventBus.js";
export type { EventHandler } from "./events/DomainEventBus.js";
export type { EventEnvelope, EventMetadata } from "./events/EventEnvelope.js";

// contracts
export type { Repository } from "./contracts/Repository.js";
export type { UnitOfWork } from "./contracts/UnitOfWork.js";

// services
export { SystemClock as SystemClockV2, FixedClock } from "./services/Clock.js";
export type { Clock as ClockV2 } from "./services/Clock.js";

// value-objects
export { Currency } from "./value-objects/Currency.js";
export { DateRange } from "./value-objects/DateRange.js";
export { Money } from "./value-objects/Money.js";
export { Percentage } from "./value-objects/Percentage.js";

// collections
export { ImmutableList } from "./collections/ImmutableList.js";

// errors
export {
  DomainError as DomainErrorV2,
  ValidationError,
  InvariantViolationError,
  NotFoundError,
  ConcurrencyError,
} from "./errors/DomainError.js";

// serialization
export { stringifyJson, parseJson } from "./serialization/Json.js";
