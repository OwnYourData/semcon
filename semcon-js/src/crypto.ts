import _canonicalize from 'canonicalize';

/**
 * Canonicalizes a JSON object according to RFC 8785 (JSON Canonicalization Scheme).
 *
 * This is the exact same canonicalization that was used by vaultifier,
 * guaranteeing byte-identical output (and therefore identical DRIs).
 */
export const canonicalize = _canonicalize;

const textEncoder = new TextEncoder();

/**
 * Creates a SHA-256 hash (hex-encoded) of the given string.
 *
 * Uses the WebCrypto API (`globalThis.crypto.subtle`), which is available
 * in browsers and in Node.js >= 20 — no dependency on `node:crypto` required.
 */
export const createSha256Hex = async (value: string): Promise<string> => {
  const digest = await sha256(textEncoder.encode(value));
  return toHex(digest);
};

// base58btc alphabet (Bitcoin/IPFS)
const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Encodes bytes as base58btc (no multibase prefix).
 */
const base58btcEncode = (bytes: Uint8Array): string => {
  let n = 0n;
  for (const byte of bytes)
    n = (n << 8n) | BigInt(byte);

  let out = '';
  while (n > 0n) {
    out = B58_ALPHABET[Number(n % 58n)] + out;
    n /= 58n;
  }

  // leading zero bytes are represented as leading '1' characters
  for (const byte of bytes) {
    if (byte !== 0)
      break;

    out = '1' + out;
  }

  return out;
};

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const sha256 = async (data: Uint8Array): Promise<Uint8Array> =>
  new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', data as BufferSource));

// multihash prefix for sha2-256 with 32 byte digest
const MULTIHASH_SHA2_256 = [0x12, 0x20];

/**
 * Generates a hashlink (DRI) for the given data.
 *
 * Objects are canonicalized (RFC 8785) first; strings are hashed as-is.
 * The result is the multibase-base58btc encoded sha2-256 multihash,
 * e.g. `zQm...` — byte-identical to what the (now removed) `hashlink`
 * dependency produced with codecs `['mh-sha2-256', 'mb-base58-btc']`.
 */
export const generateHashlink = async (data: any): Promise<string> => {
  const input: string = typeof data === 'object' ? (canonicalize(data) as string) : data;

  const digest = await sha256(textEncoder.encode(input));
  const multihash = new Uint8Array(MULTIHASH_SHA2_256.length + digest.length);
  multihash.set(MULTIHASH_SHA2_256);
  multihash.set(digest, MULTIHASH_SHA2_256.length);

  // 'z' is the multibase prefix for base58btc
  return 'z' + base58btcEncode(multihash);
};
