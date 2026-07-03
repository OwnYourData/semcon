# Semcon-JS

A JavaScript/TypeScript library to interact with **Semantic Containers** —
the successor of [`vaultifier`](https://www.npmjs.com/package/vaultifier).

* Node ≥ 22 (developed and tested with Node 24), works in browsers as well
* CommonJS build, usable with both `require()` and `import`
* Minimal dependencies: `canonicalize` (RFC 8785) and `oidc-client`
* Built-in `crypto` module for DRI/hashlink calculation — no dependency on
  the unmaintained `hashlink`/`esm` packages anymore

## Install

```bash
npm install semcon-js
```

## Example

```javascript
import { Semcon } from 'semcon-js';

async function main() {
  // connect data container
  const semcon = new Semcon('https://playground2.data-container.net');
  await semcon.initialize();

  // check if the connection is valid
  const isValid = await semcon.isValid();
  console.log(`connection is ${isValid ? 'valid' : 'invalid'}`);

  // read a record
  const item = await semcon.getItem({ id: 110 });
  console.log('data:', item);
}

main().catch(console.error);
```

## Crypto / DRI calculation

The `crypto` module provides canonicalization and hashlink (DRI) generation,
byte-identical to what vaultifier produced (verified by golden-vector tests):

```javascript
import { crypto } from 'semcon-js';

const canonical = crypto.canonicalize({ b: 1, a: 'test' });
// -> '{"a":"test","b":1}'

const dri = await crypto.generateHashlink({ b: 1, a: 'test' });
// -> 'zQmeRZcydaJnWLqbkhpE5eYJS2xZa47WAyqAkET47tXNdnx'
```

## Migrating from vaultifier

All `Vault*` names are available as deprecated aliases
(`Vaultifier` → `Semcon`, `VaultMinMeta` → `SemconMinMeta`,
`VaultPostItem` → `SemconPostItem`, ...), so existing code keeps compiling.
The aliases will be removed in a future major version — please migrate to the
`Semcon*` names.

Notable differences to vaultifier:

* Network calls use native `fetch` (no axios). `post()`/`put()` JSON-encode
  the passed data themselves — pass plain objects, not pre-stringified JSON.
* The E2E-encryption helpers (`encrypt`/`decrypt`, libsodium) were not carried
  over.
* `generateHashlink(data)` no longer accepts the unused `urls`/`meta`
  parameters (they never influenced the returned value).

## Development

```bash
npm install
npm run build      # tsc -> dist/
npm test           # vitest (includes DRI golden-vector tests)
```

## License

[Apache 2.0 License - OwnYourData.eu](LICENSE)
