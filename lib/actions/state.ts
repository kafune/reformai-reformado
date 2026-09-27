// Formato comum de retorno das server actions usadas com useActionState.
import type { ZodError } from "zod";

export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export function fromZodError(error: ZodError): ActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { error: "Confira os campos destacados.", fieldErrors };
}
