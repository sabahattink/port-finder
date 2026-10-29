<div align="center">
  <br>
  <h1>port-finder</h1>
  <p><strong>Find an available port</strong></p>
  <br>
  <p>
    <a href="https://www.npmjs.com/package/@scuton/port-finder"><img src="https://img.shields.io/npm/v/@scuton/port-finder?color=2563eb&label=npm" alt="npm"></a>
    <a href="https://www.npmjs.com/package/@scuton/port-finder"><img src="https://img.shields.io/npm/dm/@scuton/port-finder?color=gray&label=downloads" alt="downloads"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="license"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/types-TypeScript-3178c6" alt="typescript"></a>
  </p>
  <br>
</div>

> Find an available port. Start from a base and increment until one is free.

## Highlights

- ✅ Find a free port — starts from a base port and increments
- ✅ Check if a port is available — `isPortFree(3000)`
- ✅ Configurable range — specify start and end ports
- ✅ No native addons — uses Node.js `net` module
- ✅ Zero dependencies
- ✅ TypeScript support

## Install

```sh
npm install @scuton/port-finder
```

## Usage

```typescript
import { findPort, isPortFree } from '@scuton/port-finder';

// Find first free port starting from 3000
const port = await findPort();
console.log(`Server starting on port ${port}`);

// Start from a specific port
const port = await findPort(8080);

// Find a port within a range
const port = await findPort({ start: 3000, end: 4000 });

// Check if a specific port is available
if (await isPortFree(3000)) {
  server.listen(3000);
} else {
  const freePort = await findPort(3001);
  server.listen(freePort);
}
```

### Real-world example — Dev server startup

```typescript
import { findPort } from '@scuton/port-finder';
import { createServer } from 'http';

const port = await findPort(3000);
const server = createServer((req, res) => {
  res.end('Hello World');
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
```

## API

### findPort(options?)

Find the first available port.

Returns: `Promise<number>`

#### options

Type: `number | object`

If a number is passed, it's used as the start port.

##### options.start

Type: `number`\
Default: `3000`

Port to start searching from.

##### options.end

Type: `number`\
Default: `65535`

Maximum port to search.

##### options.host

Type: `string`\
Default: all local addresses

Host to check availability on. When omitted, a port only counts as free if it can be bound on the unspecified address (what `server.listen(port)` uses), `0.0.0.0`, `127.0.0.1` and `::1`. This matters on Windows, where a `127.0.0.1` bind succeeds even while another process listens on `0.0.0.0`/`::`.

### isPortFree(port, host?)

Check if a specific port is available.

Returns: `Promise<boolean>`

#### port

Type: `number`

Port to check.

#### host

Type: `string`\
Default: all local addresses (see `options.host`)

Host to check on. Rejects if the host is not a local address. Invalid ports (not an integer in 1–65535) reject with a `RangeError`.

## FAQ

### Why not detect-port or get-port?

They work great but come with dependencies. `@scuton/port-finder` does the same thing in ~30 lines with zero dependencies, using only Node.js built-in `net` module.

### What if no port is available in the range?

It throws an error: `No available port found between {start} and {end}`.

## Related

- [@scuton/kill-port](https://github.com/scuton-technology/kill-port) — Kill process on a specified port

## License

MIT © [Scuton Technology](https://scuton.com)
