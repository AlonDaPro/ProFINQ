import pg from 'pg';

const POOL_MAX_CONNECTIONS = 10;
const CONNECTION_TIMEOUT_MS = 5_000;
const IDLE_TIMEOUT_MS = 30_000;
/** A runaway query is killed by Postgres instead of holding a pooled connection forever. */
const STATEMENT_TIMEOUT_MS = 10_000;
const HEALTH_CHECK_QUERY = 'SELECT 1';

/** Errors that mean "the database is unreachable right now" (→ 503), not "the request is wrong". */
enum UnavailableErrorCode {
  ConnectionRefused = 'ECONNREFUSED',
  ConnectionReset = 'ECONNRESET',
  HostNotFound = 'ENOTFOUND',
  TimedOut = 'ETIMEDOUT',
  AdminShutdown = '57P01',
  CannotConnectNow = '57P03',
  TooManyConnections = '53300',
  /** statement_timeout fired: the database is too slow to answer right now. */
  QueryCanceled = '57014',
}

const UNAVAILABLE_ERROR_CODES: ReadonlySet<string> = new Set(Object.values(UnavailableErrorCode));
/** node-postgres reports these failures only through the message, without a code. */
const UNAVAILABLE_ERROR_MESSAGES = ['timeout exceeded when trying to connect', 'Connection terminated'] as const;

export interface RetryOptions {
  attempts: number;
  delayMs: number;
}

export function createPool(connectionString: string, onIdleClientError: (error: Error) => void): pg.Pool {
  const pool = new pg.Pool({
    connectionString,
    max: POOL_MAX_CONNECTIONS,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    statement_timeout: STATEMENT_TIMEOUT_MS,
  });
  // Without a listener, an idle client dropped by the server (DB restart,
  // network blip) emits an unhandled 'error' event and crashes the process.
  pool.on('error', onIdleClientError);
  return pool;
}

export async function checkDatabaseHealth(pool: pg.Pool): Promise<void> {
  await pool.query(HEALTH_CHECK_QUERY);
}

export async function waitForDatabase(pool: pg.Pool, { attempts, delayMs }: RetryOptions): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await checkDatabaseHealth(pool);
      return;
    } catch (error) {
      if (attempt >= attempts) {
        throw new Error(`Database is unreachable after ${attempts} attempts`, { cause: error });
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const code = 'code' in error && typeof error.code === 'string' ? error.code : undefined;
  if (code !== undefined && UNAVAILABLE_ERROR_CODES.has(code)) {
    return true;
  }
  return UNAVAILABLE_ERROR_MESSAGES.some((message) => error.message.includes(message));
}
