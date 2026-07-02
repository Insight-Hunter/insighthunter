export interface Repository<TEntity, TId extends string> {
    get(id: TId): Promise<TEntity | null>;
    save(entity: TEntity & {
        readonly id: TId;
    }): Promise<void>;
    delete(id: TId): Promise<void>;
}
export interface ListRepository<TEntity> {
    list(): Promise<readonly TEntity[]>;
}
export declare class InMemoryRepository<TEntity extends {
    readonly id: TId;
}, TId extends string> implements Repository<TEntity, TId>, ListRepository<TEntity> {
    private readonly entities;
    constructor(seed?: readonly TEntity[]);
    get(id: TId): Promise<TEntity | null>;
    getOrThrow(id: TId, entityName: string): Promise<TEntity>;
    save(entity: TEntity): Promise<void>;
    delete(id: TId): Promise<void>;
    list(): Promise<readonly TEntity[]>;
}
