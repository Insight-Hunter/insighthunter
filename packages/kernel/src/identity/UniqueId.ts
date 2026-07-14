import { randomUUID } from "node:crypto";

export class UniqueId {
  protected readonly raw: string;

  protected constructor(value?: string) {
    this.raw = value ?? randomUUID();
  }

  public static create(value?: string): UniqueId {
    return new UniqueId(value);
  }

  public toString(): string {
    return this.raw;
  }

  public equals(other: UniqueId): boolean {
    return this.raw === other.raw;
  }
}
