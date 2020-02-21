/**
 * Example lambda handler setup.
 * It is recommended that you split this into multiple files as appropriate for your setup to
 * enable you to re-use the environment and container across multiple lambda functions.
 */

import * as S3 from 'aws-sdk/clients/s3';
import { LambdaRequestHandlerFunction, LambdaWrapper } from '../src/Lambda';
import { Environment } from '../src/Environment';
import { Container, ContainerServiceInitiatorMap } from '../src/Container';
import { RequestMethod } from '../src/http/request';
import { ResponseStatusCode } from '../src/http/response';


/**
 * environment.ts
 */
type MyProjectEnvironmentMap = {
  LOG_LEVEL: string;
  MY_S3_BUCKET: 'my-s3-bucket';
};
const environment = Environment.createFromNodeProcess<MyProjectEnvironmentMap>();

/**
 * handler.ts
 */
type MyProjectServiceMap = {
  'aws.s3': S3,
};

const containerInitiator: ContainerServiceInitiatorMap<MyProjectServiceMap, MyProjectEnvironmentMap> = {
  'aws.s3': async() => {
    return new S3();
  },
};

type ContainerType = Container<MyProjectServiceMap, MyProjectEnvironmentMap>;

export const container = new Container<MyProjectServiceMap, MyProjectEnvironmentMap>(environment, containerInitiator);

/**
 * A lambda proxy wrapper allowing for the user of custom request handlers.
 * Handles the injection of the container and the handling of request/response sanitation.
 */
const handlerWrapper = new LambdaWrapper<ContainerType>(container);

/**
 * handlers/myGetLambdaHandler.ts
 */

/**
 * Your lambda handler function - this will be given the configured container, request and context for your function.
 * This is exported to enable you to test functions in isolation, your lambda functions should be invoking the `action` export.
 */
export const myGetLambdaHandler: LambdaRequestHandlerFunction<ContainerType, RequestMethod.Get, {}, {}, undefined> = async(container, request, context) => {
  const s3 = await container.service('aws.s3');

  const result = s3.createPresignedPost({
    Bucket: container.env('MY_S3_BUCKET'),
  });

  return {
    status: ResponseStatusCode.OK,
    data: {
      upload_url: result.url,
    },
  };
};

/**
 * Your lambda handler function wrapped by the method for the event you expect to receive.
 * This should be invoked by your lambda function which will then provide the container, request and context to your function.
 */
export const action = handlerWrapper.restApiProxy(myGetLambdaHandler);

/**
 * handlers/myPostLambdaHandler.ts
 */

/**
 * Your lambda handler function - this will be given the configured container, request and context for your function.
 * This is exported to enable you to test functions in isolation, your lambda functions should be invoking the `action` export.
 */
export const myPostLambdaHandler: LambdaRequestHandlerFunction<ContainerType, RequestMethod.Get, { id: string; }, {}, { name: string; }> = async(container, request, context) => {
  const s3 = await container.service('aws.s3');

  await s3.putObject({
    Bucket: container.env('MY_S3_BUCKET'),
    Key: `${request.pathParameters.id}.json`,
    Body: JSON.stringify({
      name: request.body.name,
    })
  });

  return {
    status: ResponseStatusCode.Created,
    data: {},
  };
};

/**
 * Your lambda handler function wrapped by the method for the event you expect to receive.
 * This should be invoked by your lambda function which will then provide the container, request and context to your function.
 */
export const action = handlerWrapper.restApiProxy(myPostLambdaHandler);
