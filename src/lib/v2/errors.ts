import { jsonNoStore } from "@/lib/http/api-response";

export class V2RuntimeError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "v2_runtime_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function asV2RuntimeError(error: unknown) {
  if (error instanceof V2RuntimeError) return error;
  return new V2RuntimeError(500, error instanceof Error ? error.message : "Unknown runtime error");
}

export function runtimeErrorResponse(error: unknown) {
  const runtimeError = asV2RuntimeError(error);
  return jsonNoStore(
    {
      error: {
        code: runtimeError.status,
        reason: runtimeError.code,
        message: runtimeError.message,
      },
    },
    { status: runtimeError.status }
  );
}
