import { randomUUID } from "node:crypto";

export class EntityId {
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static create(value?: string): EntityId {
    return new EntityId(value ?? randomUUID());
  }

  public equals(other: EntityId): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}
