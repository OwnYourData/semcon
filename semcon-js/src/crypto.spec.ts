import { describe, expect, it } from 'vitest';

import { canonicalize, createSha256Hex, generateHashlink } from './crypto';

// Golden vectors: canonicalized form and DRI generated with
// vaultifier 3.6.2 (canonicalize + hashlink packages).
// generateHashlink MUST stay byte-identical to these values —
// DRIs are content addresses of documents already stored in
// SOyA repositories / semantic containers.
const GOLDEN = [
  {
    name: 'simple object (key ordering)',
    input: { b: 1, a: 'test' },
    canonical: '{"a":"test","b":1}',
    dri: 'zQmeRZcydaJnWLqbkhpE5eYJS2xZa47WAyqAkET47tXNdnx',
  },
  {
    name: 'soya document',
    input: { '@context': { '@version': 1.1 }, '@graph': [{ '@id': 'X', 'range': 'xsd:string' }] },
    canonical: '{"@context":{"@version":1.1},"@graph":[{"@id":"X","range":"xsd:string"}]}',
    dri: 'zQmPrzHDVdjtJVjExTKVgrTrM4toBxLKYDqtPgPVhcH8aVc',
  },
  {
    name: 'unicode & nested structures',
    input: { name: 'Grüße', emoji: '🌱', nested: { arr: [1, 'zwei', null, true] } },
    canonical: '{"emoji":"🌱","name":"Grüße","nested":{"arr":[1,"zwei",null,true]}}',
    dri: 'zQmYNGVJbkaWDZdCz1w3rUCZMwXaCXpuGJ43vjQtVgV3ci5',
  },
  {
    name: 'plain string input (no canonicalization)',
    input: 'plain string data',
    canonical: 'plain string data',
    dri: 'zQmY3ZvNdhiGQXt2HtCWM5azpC2wsk2fFHgf7VM98oZwRzf',
  },
];

describe('canonicalize', () => {
  for (const vector of GOLDEN.filter((x) => typeof x.input === 'object')) {
    it(vector.name, () => {
      expect(canonicalize(vector.input)).toBe(vector.canonical);
    });
  }
});

describe('generateHashlink', () => {
  for (const vector of GOLDEN) {
    it(`${vector.name} → ${vector.dri}`, async () => {
      expect(await generateHashlink(vector.input)).toBe(vector.dri);
    });
  }

  it('object and its canonicalized string yield the same DRI', async () => {
    const obj = { z: [3, 2], a: 'x' };
    expect(await generateHashlink(obj)).toBe(await generateHashlink(canonicalize(obj)));
  });
});

describe('createSha256Hex', () => {
  it('matches known sha256 test vector', async () => {
    // sha256("abc")
    expect(await createSha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it('empty string', async () => {
    expect(await createSha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });
});
