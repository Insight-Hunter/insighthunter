export abstract class ValueObject<TProps> {
  protected constructor(protected readonly props: Readonly<TProps>) {
    Object.freeze(this.props);
  }

  equals(other?: ValueObject<TProps>): boolean {
    return !!other && JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
