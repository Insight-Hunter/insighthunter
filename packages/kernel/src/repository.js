import { NotFoundError } from "./errors.js";
export class InMemoryRepository {
  entities = new Map();
  constructor(seed = []) {
    for (const entity of seed) {
      this.entities.set(entity.id, entity);
    }
  }
  async get(id) {
    return this.entities.get(id) ?? null;
  }
  async getOrThrow(id, entityName) {
    const entity = await this.get(id);
    if (entity === null) {
      throw new NotFoundError(entityName, id);
    }
    return entity;
  }
  async save(entity) {
    this.entities.set(entity.id, entity);
  }
  async delete(id) {
    this.entities.delete(id);
  }
  async list() {
    return Array.from(this.entities.values());
  }
}
//# sourceMappingURL=repository.js.map
