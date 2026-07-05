export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}
export declare abstract class AbstractSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}
export declare class AdHocSpecification<T> extends AbstractSpecification<T> {
  private readonly predicate;
  constructor(predicate: (candidate: T) => boolean);
  isSatisfiedBy(candidate: T): boolean;
}
