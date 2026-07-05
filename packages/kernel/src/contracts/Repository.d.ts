import type { TypedId } from "../identity/TypedId.js";
export interface Repository<TEntity, TId extends TypedId<string>> {
  getById(id: TId): Promise<TEntity | null>;
  save(entity: TEntity): Promise<void>;
  delete(id: TId): Promise<void>;
}
