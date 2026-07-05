import type { RequestContext } from "./context.js";
import type { Result } from "./result.js";
export interface UseCase<TInput, TOutput, TError = Error> {
  execute(input: TInput, context: RequestContext): Promise<Result<TOutput, TError>>;
}
export type UseCaseHandler<TInput, TOutput, TError = Error> = (
  input: TInput,
  context: RequestContext,
) => Promise<Result<TOutput, TError>>;
export declare function defineUseCase<TInput, TOutput, TError = Error>(
  handler: UseCaseHandler<TInput, TOutput, TError>,
): UseCase<TInput, TOutput, TError>;
