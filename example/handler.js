/**
 * Example lambda handler setup.
 * It is recommended that you split this into multiple files as appropriate for your setup to
 * enable you to re-use the environment and container across multiple lambda functions.
 */

import S3 from 'aws-sdk/clients/s3';
import { LambdaWrapper } from '../src/Lambda';
import { Environment } from '../src/Environment';
import { Container } from '../src/Container';
import { ResponseStatusCode } from '../src/http/response';


/**
 * environment.ks
 */
const environment = Environment.createFromNodeProcess();

/**
 * handler.js
 */
const containerInitiator = {
  'aws.s3': async() => {
    return new S3();
  },
};

export const container = new Container(environment, containerInitiator);

/**
 * A lambda proxy wrapper allowing for the user of custom request handlers.
 * Handles the injection of the container and the handling of request/response sanitation.
 */
const handlerWrapper = new LambdaWrapper(container);

/**
 * handlers/myGetLambdaHandler.ts
 */

/**
 * Your lambda handler function - this will be given the configured container, request and context for your function.
 * This is exported to enable you to test functions in isolation, your lambda functions should be invoking the `action` export.
 */
export const myGetLambdaHandler = async(container, request, context) => {
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
export const myPostLambdaHandler = async(container, request, context) => {
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
