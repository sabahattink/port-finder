import { describe, it, expect } from 'vitest';
import net from 'net';
import { findPort, isPortFree } from '../src/index';

describe('isPortFree', () => {
  it('should return true for a free port', async () => {
    const result = await isPortFree(59876);
    expect(result).toBe(true);
  });

  it('should return false for an occupied port', async () => {
    const server = net.createServer();
    await new Promise<void>((resolve) => server.listen(59877, '127.0.0.1', resolve));
    const result = await isPortFree(59877);
    expect(result).toBe(false);
    server.close();
  });
});

describe('findPort', () => {
  it('should find a free port starting from default', async () => {
    const port = await findPort();
    expect(port).toBeGreaterThanOrEqual(3000);
    expect(port).toBeLessThanOrEqual(65535);
  });

  it('should find a free port starting from a specific port', async () => {
    const port = await findPort(8000);
    expect(port).toBeGreaterThanOrEqual(8000);
  });

  it('should find a port using options object', async () => {
    const port = await findPort({ start: 9000, end: 10000 });
    expect(port).toBeGreaterThanOrEqual(9000);
    expect(port).toBeLessThanOrEqual(10000);
  });

  it('should skip occupied ports', async () => {
    const server = net.createServer();
    await new Promise<void>((resolve) => server.listen(59870, '127.0.0.1', resolve));
    const port = await findPort(59870);
    expect(port).toBeGreaterThan(59870);
    server.close();
  });

  it('should throw when no port available in range', async () => {
    // Use an extremely narrow invalid range
    await expect(findPort({ start: 65535, end: 65534 })).rejects.toThrow('No available port');
  });

  it('should return the exact port if it is free', async () => {
    const free = await isPortFree(59890);
    if (free) {
      const port = await findPort(59890);
      expect(port).toBe(59890);
    }
  });
});

function listen(port: number, host?: string): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen({ port, host }, () => resolve(server));
  });
}

function close(server: net.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

describe('wildcard listeners (default host)', () => {
  it('reports a port held on the unspecified address (::) as busy', async () => {
    const server = await listen(59861);
    try {
      expect(await isPortFree(59861)).toBe(false);
      expect(await findPort({ start: 59861, end: 59863 })).not.toBe(59861);
    } finally {
      await close(server);
    }
  });

  it('reports a port held on 0.0.0.0 as busy', async () => {
    const server = await listen(59864, '0.0.0.0');
    try {
      expect(await isPortFree(59864)).toBe(false);
    } finally {
      await close(server);
    }
  });

  it('checks only the given host when one is passed', async () => {
    const server = await listen(59866, '127.0.0.1');
    try {
      expect(await isPortFree(59866, '127.0.0.1')).toBe(false);
    } finally {
      await close(server);
    }
  });
});

describe('input validation', () => {
  it.each([0, -1, 65536, 3000.5, NaN])('isPortFree rejects invalid port %s', async (port) => {
    await expect(isPortFree(port)).rejects.toThrow(RangeError);
  });

  it('never returns port 0', async () => {
    await expect(findPort({ start: 0, end: 10 })).rejects.toThrow(RangeError);
  });

  it('rejects an out-of-range start or end', async () => {
    await expect(findPort(70000)).rejects.toThrow(RangeError);
    await expect(findPort({ start: 3000, end: 70000 })).rejects.toThrow(RangeError);
  });

  it('fails fast for a host that is not a local address instead of scanning the range', async () => {
    // 192.0.2.1 is TEST-NET-1 (RFC 5737), never assigned to a local interface
    await expect(isPortFree(59867, '192.0.2.1')).rejects.toThrow();
    await expect(findPort({ start: 59867, end: 59869, host: '192.0.2.1' })).rejects.not.toThrow('No available port');
  });
});
