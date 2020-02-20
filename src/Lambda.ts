import { APIGatewayProxyEvent, APIGatewayProxyHandler, Context, Handler } from 'aws-lambda';
import { ContainerInterface } from './Container';
import { RequestMethod } from './http/request';
import { ResponseHeader, ResponseKind } from './http/response';
import { APIGatewayEventRequestContext } from 'aws-lambda/common/api-gateway';


/**
 * The type expected as a response for a lambda proxy.
 */
export type LambdaProxyResponse = {
  statusCode: number;
  headers: StringMap;
  body: string;
};


/**
 * A lambda handler function that is based on endpoint configuration.
 * Provide the endpoint name and the event will become type aware.
 */
export type ContainerLambdaHandlerFunction<C extends ContainerInterface<{}>, E extends {}, O extends {}> = (
  container: C,
  event: E,
  context: Context,
) => Promise<O>;


class BadRequestError extends Error {}


/**
 * A custom lambda request that allows for cleaner usage in custom handlers.
 * Data in this request has been sanitised already.
 */
export type LambdaRequest<
  M extends RequestMethod,
  P extends {},
  Q extends {},
  B extends undefined,
  > = {
  httpMethod: M;
  pathParameters: P;
  queryStringParameters: Q;
  body: B;

  path: string;
  headers: StringMap;
  isBase64Encoded: boolean;
  multiValueHeaders: { [name: string]: string[] };
  multiValueQueryStringParameters: null | { [name: string]: string[] };
  stageVariables: null | StringMap;
  requestContext: APIGatewayEventRequestContext;
  resource: string;
};

/**
 * A custom lambda handler.
 */
export type LambdaRequestHandlerFunction<
  C extends ContainerInterface<{}>,
  M extends RequestMethod,
  P extends {},
  Q extends {},
  B extends {},
  > = (
  container: C,
  request: LambdaRequest<M, P, Q, B>,
  context: Context,
) => Promise<ResponseKind>;


/**
 * Handle the creation of a lambda request type by transforming the lambda proxy event.
 * This function should santise all data and make a consistent and safe request object.
 */
export const createLambdaRequest = <
  M extends RequestMethod,
  P extends {},
  Q extends {},
  B extends {},
  >(event: APIGatewayProxyEvent): LambdaRequest<M, P, Q, B> => {
  let body = undefined as B;

  if (event.headers['content-type'] === 'application/json') {
    try {
      if (typeof event.body === 'string' && event.body !== '') {
        body = JSON.parse(event.body) as B;
      }
    } catch (error) {
      // Invalid payload
    }
  }

  return {
    httpMethod: event.httpMethod as M,
    pathParameters: event.pathParameters === null
      ? {} as P
      : event.pathParameters as P,

    queryStringParameters: event.queryStringParameters === null
      ? {} as Q
      : event.queryStringParameters as Q,

    body,

    path: event.path,
    headers: event.headers,
    multiValueHeaders: event.multiValueHeaders,
    isBase64Encoded: event.isBase64Encoded,
    requestContext: event.requestContext,
    resource: event.resource,
    stageVariables: event.stageVariables,
    multiValueQueryStringParameters: event.multiValueQueryStringParameters,
  };
};

/**
 * Handle the creation of a lambda proxy response type by transforming an internal response object.
 * Important to remember that the body needs to be JSON encoded (must be a string body).
 */
export const createLambdaProxyResponse = (response: ResponseKind): LambdaProxyResponse => {
  const json = JSON.stringify(response.data);

  return {
    statusCode: response.status,

    headers: {
      [ResponseHeader.ContentType]: 'application/json',
      [ResponseHeader.ContentLength]: String(json.length),

      [ResponseHeader.AccessControlAllowOrigin]: '*',
      [ResponseHeader.AccessControlAllowHeaders]: '*',
      [ResponseHeader.AccessControlAllowMethods]: '*',
      [ResponseHeader.AccessControlAllowCredentials]: '*',
    },

    body: json,
  };
};


/**
 * A lambda proxy wrapper to enhance functions.
 */
export class LambdaWrapper<C extends ContainerInterface<{}>> {
  private readonly container: C;

  public constructor(container: C) {
    this.container = container;
  }

  /**
   * Create a HTTP handler using the given custom lambda handler.
   * Ensure the container is injected and the request/responses are sanitised.
   */
  public restApiProxy<
    M extends RequestMethod,
    P extends {},
    Q extends {},
    B extends {},
    >(handler: LambdaRequestHandlerFunction<C, M, P, Q, B>): APIGatewayProxyHandler {
    return async(event, context) => {

      try {
        const request = createLambdaRequest<M, P, Q, B>(event);
        const response = await handler(this.container, request, context);

        return createLambdaProxyResponse(response);
      } catch (caught) {
        const error: Error = caught;
        const response = {
          status: 500,
          type: 'internal.error',

          data: {
            name: error.name,
            message: error.message,
            stack: error.stack?.split('\n') ?? [],
          },
        };

        return createLambdaProxyResponse(response);
      }
    };
  }

  /**
   * Wrap a custom handler function with an AWS lambda handler function.
   * Allow the injection of the container object.
   */
  public handle<E, O>(handler: ContainerLambdaHandlerFunction<C, E, O>): Handler<E, O> {
    return async(event, context): Promise<O> => {
      return handler(this.container, event, context);
    };
  }
}
