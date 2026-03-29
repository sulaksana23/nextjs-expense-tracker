type RuntimeErrorContext = {
  area: string;
};

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}

export function logRuntimeError(context: RuntimeErrorContext, error: unknown) {
  console.error(`[runtime:${context.area}]`, error);
}

export function getRuntimeDebugDetails(error: unknown) {
  if (process.env.NODE_ENV !== "development") {
    return undefined;
  }

  return getErrorMessage(error);
}
