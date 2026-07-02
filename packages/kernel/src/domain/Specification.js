export class AbstractSpecification {
    and(other) {
        return new AdHocSpecification((candidate) => {
            return this.isSatisfiedBy(candidate) && other.isSatisfiedBy(candidate);
        });
    }
    or(other) {
        return new AdHocSpecification((candidate) => {
            return this.isSatisfiedBy(candidate) || other.isSatisfiedBy(candidate);
        });
    }
    not() {
        return new AdHocSpecification((candidate) => !this.isSatisfiedBy(candidate));
    }
}
export class AdHocSpecification extends AbstractSpecification {
    predicate;
    constructor(predicate) {
        super();
        this.predicate = predicate;
    }
    isSatisfiedBy(candidate) {
        return this.predicate(candidate);
    }
}
//# sourceMappingURL=Specification.js.map