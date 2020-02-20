export enum ResponseStatusCode {
  OK = 200,
  Created = 201,
  NoContent = 204,

  NotFound = 404,

  InternalServerError = 500,
}

export enum ResponseHeader {
  CustomResponseType = 'x-response-type',

  ContentType = 'content-type',
  ContentLength = 'content-length',

  AccessControlAllowOrigin = 'access-control-allow-origin',
  AccessControlAllowHeaders = 'access-control-allow-headers',
  AccessControlAllowMethods = 'access-control-allow-methods',
  AccessControlAllowCredentials = 'access-control-allow-credentials',
}

export type ResponseKind = {
  status: ResponseStatusCode;
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};
