import { NotFoundError } from "./errors.js";

export interface Repository<TEntity, TId extends string> {
  get(id: TId): Promise<TEntity | null>;
  save(entity: TEntity & { readonly id: TId }): Promise<void>;
  delete(id: TId): Promise<void>;
}

export interface ListRepository<TEntity> {
  list(): Promise<readonly TEntity[]>;
}

export class InMemoryRepository<
  TEntity extends { readonly id: TId },
  TId extends string,
> implements Repository<TEntity, TId>, ListRepository<TEntity>
{
  private readonly entities = new Map<TId, TEntity>();

  constructor(seed: readonly TEntity[] = []) {
    for (const entity of seed) {
      this.entities.set(entity.id, entity);
    }
  }

  async get(id: TId): Promise<TEntity | null> {
    return this.entities.get(id) ?? null;
  }

  async getOrThrow(id: TId, entityName: string): Promise<TEntity> {
    const entity = await this.get(id);

    if (entity === null) {
      throw new NotFoundError(entityName, id);
    }

    return entity;
  }

  async save(entity: TEntity): Promise<void> {
    this.entities.set(entity.id, entity);
  }

  async delete(id: TId): Promise<void> {
    this.entities.delete(id);
  }

  async list(): Promise<readonly TEntity[]> {
    return Array.from(this.entities.values());
  }
}
