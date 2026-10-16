import { z } from 'zod';
import { DEFAULT_REQUEST_TIMEOUT_MS, HttpHeader, HttpMethod, JSON_MEDIA_TYPE } from '@/constants/http';
import { ApiError } from './ApiError';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  /** Lets callers cancel superseded requests; cancellation rejects with an AbortError. */
  signal?: AbortSignal;
}

interface RequestSignals {
  caller?: AbortSignal;
  timeout: AbortSignal;
  combined: AbortSignal;
}

/** The server's documented error envelope: `{ "error": { "code", "message", "details?" } }`. */
const apiErrorBodySchema = z.object({
  error: z.object({
    message: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});

const TIMEOUT_MESSAGE = 'The server took too long to respond';
const NETWORK_MESSAGE = 'Could not reach the server. Check your connection.';
const MALFORMED_MESSAGE = 'The server returned a malformed response';

function createSignals(caller?: AbortSignal): RequestSignals {
  const timeout = AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS);
  if (!caller) return { timeout, combined: timeout };
  // Hand-rolled AbortSignal.any(), which only reached Safari in 17.4.
  const controller = new AbortController();
  const abort = () => {
    controller.abort();
  };
  if (caller.aborted) abort();
  caller.addEventListener('abort', abort, { once: true });
  timeout.addEventListener('abort', abort, { once: true });
  return { caller, timeout, combined: controller.signal };
}

/**
 * The timeout and the caller's signal cover the whole exchange, body included, so an
 * abort can surface while sending or while reading. Either way: caller cancellation is
 * rethrown untouched (an AbortError), a timeout says so, anything else is `fallback`.
 */
function transportError(error: unknown, signals: RequestSignals, fallback: string, status?: number): unknown {
  if (signals.caller?.aborted) return error;
  return new ApiError(signals.timeout.aborted ? TIMEOUT_MESSAGE : fallback, status, [], { cause: error });
}

async function send(url: string, { method = HttpMethod.Get, body }: RequestOptions, signals: RequestSignals) {
  const headers: Record<string, string> = { [HttpHeader.Accept]: JSON_MEDIA_TYPE };
  if (body !== undefined) headers[HttpHeader.ContentType] = JSON_MEDIA_TYPE;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signals.combined,
    });
  } catch (error) {
    throw transportError(error, signals, NETWORK_MESSAGE);
  }

  if (!response.ok) {
    throw await toHttpError(response);
  }
  return response;
}

async function toHttpError(response: Response): Promise<ApiError> {
  try {
    const parsed = apiErrorBodySchema.safeParse(await response.json());
    if (parsed.success) {
      const { message, details = [] } = parsed.data.error;
      // "Request validation failed (email: Invalid email)" reads well even where fields are not shown.
      const summary = details.map((detail) => `${detail.path}: ${detail.message}`).join('; ');
      return new ApiError(summary ? `${message} (${summary})` : message, response.status, details);
    }
  } catch {
    // Non-JSON error bodies (proxies, HTML error pages) fall through to the generic message.
  }
  return new ApiError(`Request failed with status ${response.status}`, response.status);
}

/** Sends a request and validates the JSON response against `schema`, so callers get typed, trusted data. */
export async function requestJson<T>(
  url: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  options: RequestOptions = {},
): Promise<T> {
  const signals = createSignals(options.signal);
  const response = await send(url, options, signals);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw transportError(error, signals, MALFORMED_MESSAGE, response.status);
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    // The zod error stays on `cause` for debugging; users get a plain sentence, not schema internals.
    throw new ApiError('The server returned unexpected data', response.status, [], { cause: parsed.error });
  }
  return parsed.data;
}

export async function requestNoContent(url: string, options: RequestOptions = {}): Promise<void> {
  await send(url, options, createSignals(options.signal));
}
