export class NameAwareError extends Error {
  public readonly name: string;
  public readonly error: string;

  public constructor(name: string, message: string) {
    super(message);

    this.name = name;
    this.error = message;
  }
}
