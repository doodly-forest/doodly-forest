export function hasErrorName(error: unknown, name: string) {
  return typeof error === "object" && error !== null && "name" in error && error.name === name;
}

// The race also releases the UI if a transport ignores AbortSignal.
// Cancellation is still forwarded to the actual network request.
export async function withDeadline<T>(parent: AbortSignal, ms: number, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  parent.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(parent.reason);
  const timer = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), ms);
  parent.addEventListener("abort", abort, { once: true });
  if (parent.aborted) abort();
  let rejectAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = () => reject(controller.signal.reason);
    if (controller.signal.aborted) rejectAbort();
    else controller.signal.addEventListener("abort", rejectAbort, { once: true });
  });
  try {
    controller.signal.throwIfAborted();
    return await Promise.race([work(controller.signal), aborted]);
  } finally {
    clearTimeout(timer);
    parent.removeEventListener("abort", abort);
    if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
  }
}
