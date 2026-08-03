export type ActionResult<T = void> =
  | { success: true; data: T }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };

export function success<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function failure(
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>
): ActionResult<never> {
  return { success: false, error: { code, message, fieldErrors } };
}
