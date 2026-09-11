# Resolving foreign DIDs and verifying signed statements

What `app/services/` provides, what it deliberately does not, and the two
extension points in the Doorkeeper configuration that go with it.

These building blocks are generic. They know about Ed25519, JOSE and DID
documents, and about nothing else — no delegation, no products, no tenancy. An
application derived from `dc-base` builds those on top; if a concept from that
layer ever appears in one of these files, it has leaked downwards.

---

## The four pieces

### `DidResolver` — foreign DIDs, cached

    document = DidResolver.resolve("did:oyd:zQm…")   # DidDocument or nil

Until now `dc-base` only ever looked up DIDs it had stored itself
(`ApplicationHelper#resolve_did` reads the local `dids` table). This resolves
DIDs held **elsewhere**, through `Oydid.read`, and it is written for the hot
path of a request rather than for an occasional administrative call:

| Property | Value | Why |
|---|---|---|
| positive cache | 300 s | without it the availability of this service hangs on the availability of a VDR, and a resolving request path is a denial-of-service amplifier pointed at someone else's server |
| negative cache | 60 s | a DID that does not resolve is asked about once, not once per request |
| timeout | 5 s | HTTParty inside the oydid gem has none; a hanging VDR would otherwise hold a request thread for as long as it likes |
| local fallback | **none** | anyone may POST a DID to this service; a locally stored entry must not be able to shadow a foreign identity |

Any failure — unresolvable, timeout, exception — is `nil`. Callers refuse; they
never see a 500 from here.

Test seam, because a test must not depend on a VDR:

    DidResolver.prime(did, w3c_document)   # positive
    DidResolver.prime_missing(did)         # negative
    DidResolver.forget(did)

`prime` writes into `Rails.cache`, which is why `config/environments/test.rb`
uses `:memory_store` and not `:null_store` — with a null store, priming would
silently do nothing and every test would fail on an unresolvable DID.

Resolution is the trust boundary. `DidResolver` does not additionally verify
that a `did:oyd` is self-certifying; it relies on what `Oydid.read` returns.
That is what makes priming legitimate rather than a way around a check.

### `DidDocument` — which key signs for this DID

    document.verify_key("did:oyd:zQm…#key-doc")   # RbNaCl VerifyKey or nil

Reads `verificationMethod[].publicKeyMultibase`, decodes it through
`Oydid.multi_decode` (so that this and the DID layer cannot drift apart on the
same string) and insists on the `ed25519-pub` multicodec.

Two decisions worth knowing:

* **An unknown `kid` yields no key.** It does not fall back to the first
  verification method. A caller that names a key that is not in the document
  gets a refusal, not a different key.
* **Delegated keys are not followed.** Only the document key. Every additional
  key that may sign is another way to lose control of a DID without noticing;
  if a use case needs them, it should say so explicitly rather than inherit
  them here.

`DidDocument.from_oydid(did, did_info)` builds the W3C view of what
`Oydid.read` returns, carrying over the document key only.

### `Jws` — compact JWS with `alg: EdDSA`

    result = Jws.verify(token, typ: "some-statement+jwt",
                               allow: %w[alg typ kid], verify_key: key)
    result.ok?      # true / false
    result.claims   # the payload, only when ok?
    result.reason   # :wrong_typ, :wrong_alg, :crit_not_supported,
                    # :header_not_allowed, :bad_signature, … when not

    Jws.peek(token).header    # header only, no verification —
                              # for picking a key, and for nothing else

Four properties this exists to guarantee:

* **The algorithm is never taken from the token.** `alg` is compared against
  the fixed value `EdDSA`; the key is chosen by the caller (RFC 8725 §3.1).
  `alg: none` is not a special case here — it is simply not `EdDSA`.
* **`typ` is a required argument, not an option.** Statements that are not
  separated by `typ` can be presented to each other's verifiers
  (RFC 8725 §3.11). Making it a keyword argument means a caller cannot forget
  it; it has to decide.
* **A `crit` header is refused outright.** RFC 7515 §4.1.11 obliges a recipient
  to reject a JWS whose `crit` names extensions it does not understand. This
  verifier understands none, so every `crit` is `:crit_not_supported` — an
  empty array included, because a sender that announces extensions and names
  none is not a sender we can read. `Jws.peek` is unchanged: it chooses a key
  and verifies nothing.
* **The header is an allowlist.** `allow` names the header parameters the
  statement may carry; every other key is `:header_not_allowed`, whatever its
  value. `allow` is a required argument for the same reason `typ` is — a
  default is forgotten, an argument is not — and `nil` allows nothing rather
  than raising. A denylist of the parameters JOSE knows today would have to be
  maintained as the standard grows, and whoever forgets to maintain it does not
  find out; see CC-ADR 0013, addendum of 2026-09-10.

There are exactly two calling sets, and the addendum names them:

| statement | allowed header parameters |
| --- | --- |
| delegation and client assertion — key comes from the DID via `kid` | `alg`, `typ`, `kid` |
| DPoP proof — key comes from the header | `alg`, `typ`, `jwk` |

The gain is not the parameters this refuses by name. It is that a `jwk` in the
header of a delegation is now refused instead of silently ignored: the
separation between "key from the DID" and "key from the header" became
structural rather than a property of the order in which things are called.

Checked in this order: `alg`, `typ`, `crit`, allowlist, then the signature.
`crit` keeps its own reason although the allowlist covers it — RFC 7515 demands
that refusal by name, and the log should say so.

Failures return a reason symbol rather than raising. Log the reason, answer
with something generic — a precise error message is a manual for forging the
next attempt.

Why not the `jwt` gem, which is already in the lockfile: its EdDSA path calls
RbNaCl anyway, and every claim rule it applies by default would have to be
switched off, because validity windows and audiences differ per statement type
and belong to the caller. What would be left is what stands in `Jws`.

### `Jwk` — Ed25519 keys as JWK, and their thumbprint

    Jwk.thumbprint(jwk)          # RFC 7638, base64url, unpadded
    Jwk.from_raw_ed25519(bytes)
    Jwk.raw_ed25519(jwk)
    Jwk.verify_key(jwk)

The thumbprint is the value an access token is bound to when a derived
application implements RFC 9449 (`cnf.jkt`). Two implementations in two
languages have to agree on it byte for byte, which is why the test pins it
against a known vector rather than against itself.

Base64url decoding is strict: padding, whitespace and the standard alphabet are
all refused instead of being repaired.

---

## The two Doorkeeper extension points

Both sit in `config/initializers/doorkeeper.rb` and contain no application
vocabulary — they are for Doorkeeper what `Gemfile.extend` and
`config/routes/extend.rb` are for the rest.

### `DC_GRANT_FLOWS` — additional grant types

    grant_flows(%w[authorization_code client_credentials] +
                ENV.fetch("DC_GRANT_FLOWS", "").split(",")…)

A derived application registers its own flow and names it in the environment:

```ruby
# config/initializers/…_after_doorkeeper.rb   (loaded after doorkeeper.rb,
#                                              initializers run alphabetically)
require Rails.root.join("lib/doorkeeper/request/my_flow")

Doorkeeper::GrantFlow.register(
    :my_flow,
    grant_type_matches: "urn:example:params:oauth:grant-type:something",
    grant_type_strategy: Doorkeeper::Request::MyFlow
)
```

```yaml
env:
  - name: DC_GRANT_FLOWS
    value: my_flow
```

The strategy is a class taking the `Doorkeeper::Server` and answering
`#authorize`; `server.context` is the tokens controller, so request headers are
reachable. Whatever `#authorize` returns is rendered as-is, as long as it
answers `#body`, `#status` and `#headers` — which is the way to produce a token
response Doorkeeper does not model itself.

A name that is not registered is dropped silently (Doorkeeper compacts what its
registry does not know), so a typo disables the flow instead of breaking the
boot. That is precisely why a registered flow belongs in a test.

### The `DPoP` authorization scheme

`Doorkeeper::OAuth::Token.from_bearer_authorization` matches `/^Bearer /i`
only, so a request presenting `Authorization: DPoP <token>` would never reach
the token lookup. `access_token_methods` accepts anything that responds to
`#call`, so a lambda is enough and no monkey patch is needed.

Recognising the scheme is generic. What a DPoP proof has to satisfy — `htm`,
`htu`, `ath`, freshness, the key matching the token's `cnf.jkt` — is decided by
whichever layer issues bound tokens, not here.

---

## Cache configuration

`Rails.cache` is now load-bearing, so it is set explicitly rather than left to
the default:

| Environment | Store | Note |
|---|---|---|
| development | `:memory_store` | unchanged |
| test | `:memory_store` | was `:null_store`; priming needs a real store |
| production | `:memory_store`, 32 MB | per process, so each replica keeps its own — which only shortens the window in which a revoked DID stays cached |

## Running the tests

    bin/rails test test/services
