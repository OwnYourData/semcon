export class SemconError extends Error {
  constructor(readonly message: string, readonly error: any) {
    super(message);
  }
}
