# README

This README would normally document whatever steps are necessary to get the
application up and running.

Things you may want to cover:

* Ruby version

* System dependencies

* Configuration

* Database creation

* Database initialization

* How to run the test suite

* Services (job queues, cache servers, search engines, etc.)

* Deployment instructions

* ...

## Documentation

* [Resolving foreign DIDs and verifying signed statements](docs/DID-and-JWS.md)
  — what `app/services/` provides (`DidResolver`, `DidDocument`, `Jws`, `Jwk`),
  the caching discipline it relies on, and the two extension points in the
  Doorkeeper configuration that derived applications use to add a grant flow
  and to accept the `DPoP` authorization scheme.
