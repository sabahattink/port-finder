import net from 'net';

export interface FindPortOptions {
  start?: number;
  end?: number;
  host?: string;
}

const MIN_PORT = 1;
const MAX_PORT = 65535;
const DEFAULT_START = 3000;

/** The port is taken (or not usable by this process): try the next one. */
const BUSY_CODES = new Set(['EADDRINUSE', 'EACCES']);
/** The address family/interface does not exist on this machine. */
const UNAVAILABLE_CODES = new Set(['EADDRNOTAVAIL', 'EAFNOSUPPORT']);

/**
 * Addresses probed when no host is given. A server started with
 * `listen(port)` binds the unspecified address, and on Windows a more
 * specific bind (e.g. 127.0.0.1) still succeeds while a wildcard listener
 * holds the port, so every common local address must be checked.
 */
const DEFAULT_HOSTS: ReadonlyArray<string | undefined> = [undefined, '0.0.0.0', '127.0.0.1', '::1'];

type Probe = 'free' | 'busy' | 'unavailable';

function assertPort(value: number, name: string): void {
  if (!Number.isInteger(value) || value < MIN_PORT || value > MAX_PORT) {
    throw new RangeError(`Invalid ${name}: ${value}. Expected an integer between ${MIN_PORT} and ${MAX_PORT}.`);
  }
}

function probe(port: number, host: string | undefined): Promise<Probe> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== undefined && BUSY_CODES.has(err.code)) resolve('busy');
      else if (err.code !== undefined && UNAVAILABLE_CODES.has(err.code)) resolve('unavailable');
      else reject(err);
    });
    server.once('listening', () => {
      server.close(() => resolve('free'));
    });
    server.listen({ port, host, exclusive: true });
  });
}

async function checkPort(port: number, host: string | undefined): Promise<boolean> {
  if (host !== undefined) {
    const result = await probe(port, host);
    if (result === 'unavailable') {
      throw new Error(`Cannot check port ${port}: host ${host} is not a local address`);
    }
    return result === 'free';
  }

  for (const candidate of DEFAULT_HOSTS) {
    // 'unavailable' here only means e.g. no IPv6 stack; it does not make the port busy.
    if ((await probe(port, candidate)) === 'busy') return false;
  }
  return true;
}

/**
 * Check whether `port` can be bound. Without `host`, the port must be free on
 * the unspecified address, 0.0.0.0, 127.0.0.1 and ::1; with `host`, only that
 * address is checked. Rejects with a RangeError for an invalid port and with
 * the underlying error when `host` cannot be bound at all.
 */
export async function isPortFree(port: number, host?: string): Promise<boolean> {
  assertPort(port, 'port');
  return checkPort(port, host);
}

export async function findPort(
  optionsOrStart?: number | FindPortOptions
): Promise<number> {
  const options: FindPortOptions =
    typeof optionsOrStart === 'number' ? { start: optionsOrStart } : optionsOrStart ?? {};
  const start = options.start ?? DEFAULT_START;
  const end = options.end ?? MAX_PORT;
  const host = options.host;

  assertPort(start, 'start port');
  assertPort(end, 'end port');

  for (let port = start; port <= end; port++) {
    if (await checkPort(port, host)) {
      return port;
    }
  }

  throw new Error(`No available port found between ${start} and ${end}`);
}
