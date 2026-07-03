# Changelog

## 0.4.0 (2026-07-03)

* **Node 24 stack:** engines Node ≥ 22, TypeScript 5.9, `@types/node` 24
* **New `crypto` module:** `canonicalize` (RFC 8785), `createSha256Hex`,
  `generateHashlink` (DRI calculation) — implemented natively with WebCrypto
  and an internal base58btc encoder; byte-identical to vaultifier/hashlink
  output (golden-vector tests included). No dependency on the unmaintained
  `hashlink`/`esm` packages.
* **vaultifier compatibility aliases:** `Vaultifier`, `VaultMinMeta`,
  `VaultPostItem`, etc. are exported as deprecated aliases for their
  `Semcon*` counterparts (see `src/compat.ts`).
* **Default network adapter:** response bodies are parsed as JSON when
  possible, otherwise returned as raw text (YAML/turtle endpoints) — mimics
  axios' behavior that vaultifier consumers relied on.
* Communicator types (`MaybeAuthenticated`, `NetworkAdapter`,
  `NetworkResponse`, `Communicator`) are now exported from the package index.
* **Cleanups:** renamed `src/vaulitfier.ts` (typo) to `src/semcon.ts`;
  single CommonJS build to `dist/` (previously duplicate `dist/main` +
  `dist/module`, with `main` incorrectly pointing to `dist/module`);
  removed stale `ava`/`nyc`/commitizen config and unused dev dependencies;
  added `vitest` test setup.

## 0.3.0

* Initial refactoring of vaultifier into semcon-js
