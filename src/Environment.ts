import { NameAwareError } from './Error';

export const MissingEnvironmentVariableErrorName = 'MissingEnvironmentVariableError';

/**
 * Custom error for missing environment keys.
 */
export class MissingEnvironmentVariableError extends NameAwareError {
  public constructor(key: string) {
    const message = `Cannot find "${key}" in the environment!`;

    super(MissingEnvironmentVariableErrorName, message);
  }
}


export type EnvironmentInitiatorMap = {
  [key: string]: string | number;
};


/**
 * An environment.
 */
export class Environment<M extends EnvironmentInitiatorMap> {
  private search: M;

  /**
   * Create an instance from the Node process.
   */
  public static createFromNodeProcess<M extends EnvironmentInitiatorMap>(): Environment<M> {
    const store = process.env as unknown as M;

    return Environment.create<M>(store);
  }

  /**
   * Create an instance using the given search.
   */
  public static create<M extends EnvironmentInitiatorMap>(search: M): Environment<M> {
    return new Environment<M>(search);
  }

  public constructor(search: M) {
    this.search = search;
  }

  /**
   * This function will prepared a function that can be used to fetch environment variables.
   * When the given key is not found in the environment it will throw.
   */
  public get<K extends keyof M>(key: K): M[K] {
    const value = this.search[key];

    if (value === undefined) {
      throw new MissingEnvironmentVariableError(key);
    }

    return value;
  }
}
