export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

export abstract class AbstractSpecification<T> implements Specification<T> {
  public abstract isSatisfiedBy(candidate: T): boolean;

  public and(other: Specification<T>): Specification<T> {
    return new AdHocSpecification((candidate) => {
      return this.isSatisfiedBy(candidate) && other.isSatisfiedBy(candidate);
    });
  }

  public or(other: Specification<T>): Specification<T> {
    return new AdHocSpecification((candidate) => {
      return this.isSatisfiedBy(candidate) || other.isSatisfiedBy(candidate);
    });
  }

  public not(): Specification<T> {
    return new AdHocSpecification((candidate) => !this.isSatisfiedBy(candidate));
  }
}

export class AdHocSpecification<T> extends AbstractSpecification<T> {
  private readonly predicate: (candidate: T) => boolean;

  public constructor(predicate: (candidate: T) => boolean) {
    super();
    this.predicate = predicate;
  }

  public isSatisfiedBy(candidate: T): boolean {
    return this.predicate(candidate);
  }
}
