import { TypedId } from "../identity/TypedId.js";

export abstract class Entity<TId extends TypedId<string>, TProps extends object> {
  protected readonly _id: TId;
  protected props: TProps;

  protected constructor(id: TId, props: TProps) {
    this._id = id;
    this.props = props;
  }

  public get id(): TId {
    return this._id;
  }

  public equals(other: Entity<TId, TProps>): boolean {
    return this._id.equals(other._id);
  }
}
