import { Result } from "../primitives/Result.js";

export interface Policy<TSubject, TError = Error> {
  readonly name: string;
  evaluate(subject: TSubject): Result<true, TError>;
}
