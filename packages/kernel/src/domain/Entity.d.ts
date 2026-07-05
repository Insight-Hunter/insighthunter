import type { TypedId } from "../identity/TypedId.js";
export declare abstract class Entity<TId extends TypedId<string>, TProps extends object> {
  protected readonly _id: TId;
  protected props: TProps;
  protected constructor(id: TId, props: TProps);
  get id(): TId;
  equals(other: Entity<TId, TProps>): boolean;
}
