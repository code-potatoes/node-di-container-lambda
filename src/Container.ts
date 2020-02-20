import { Environment } from './Environment';
import { NameAwareError } from './Error';


export const ContainerMissingServiceErrorName = 'ContainerMissingServiceInitiatorError';

class ContainerMissingServiceError extends NameAwareError {
  public constructor(service: string) {
    const message = [
      `The service "${service}" has no initiator provided.`,
      'Please provide an initiator for this service before calling it.',
    ].join(' ');

    super(ContainerMissingServiceErrorName, message);
  }
}

/**
 * A simplistic service container representation.
 */
export type ContainerInterface<C extends {}> = {
  /**
   * Return the service by the given identity.
   */
  service<K extends keyof C>(service: K): Promise<C[K]>;
};

type ContainerServiceInitiator<M, E, P, S> = (container: Container<M, E, P>) => Promise<S>;

export type ContainerServiceInitiatorMap<M, E, P> = {
  [K in keyof M]: ContainerServiceInitiator<M, E, P, M[K]>;
};

export class Container<M extends {}, E extends {}, P extends {}> implements ContainerInterface<M> {
  public parameters: P;
  private readonly environment: Environment<E>;
  private readonly initiator: ContainerServiceInitiatorMap<M, E, P>;
  private readonly cache: Partial<M>;

  public constructor(environment: Environment<E>, initiator: ContainerServiceInitiatorMap<M, E, P>, parameters: P) {
    this.parameters = parameters;
    this.environment = environment;
    this.initiator = initiator;
    this.cache = {};
  }

  /**
   * Quick access to the environment.
   */
  public env<K extends keyof E>(key: K): E[K] {
    return this.environment.get(key);
  }

  /**
   * {@inheritdoc}
   */
  public async service<K extends keyof M>(service: K): Promise<M[K]> {
    const cached = this.cache[service];

    if (cached !== undefined) {
      return cached as M[K];
    }

    const initiator = this.initiator[service];

    if (initiator === undefined) {
      throw new ContainerMissingServiceError(service);
    }

    const constructed = await initiator(this);

    this.cache[service] = constructed;

    return constructed;
  }

}
