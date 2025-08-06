export type StatusCode = 400 | 401 | 404 | 500;

export enum StatusMessage {
  BAD_REQUEST = "BAD_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  NOT_FOUND = "NOT_FOUND",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
}

export class StatusCodeMapper {
  private static statusMap: Record<StatusMessage, StatusCode> = {
    [StatusMessage.BAD_REQUEST]: 400,
    [StatusMessage.UNAUTHORIZED]: 401,
    [StatusMessage.NOT_FOUND]: 404,
    [StatusMessage.INTERNAL_SERVER_ERROR]: 500,
  } as const;

  private static reverseStatusMap: Record<StatusCode, StatusMessage> =
    Object.fromEntries(
      Object.entries(StatusCodeMapper.statusMap).map(([key, value]) => [
        value,
        key,
      ])
    ) as Record<StatusCode, StatusMessage>;

  public static getCode(message: StatusMessage): StatusCode {
    return this.statusMap[message] || 500; // Default to 500 if not found
  }

  public static getMessage(statusCode: StatusCode): StatusMessage {
    return (
      this.reverseStatusMap[statusCode] ?? StatusMessage.INTERNAL_SERVER_ERROR
    );
  }
}

class CustomError extends Error {
  public statusCode: StatusCode;

  constructor(message: string, statusMessage: StatusMessage) {
    super(message);
    this.statusCode = StatusCodeMapper.getCode(statusMessage);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class CrudError extends CustomError {
  constructor(
    statusMessage: StatusMessage = StatusMessage.INTERNAL_SERVER_ERROR,
    detail: string
  ) {
    super(`Error: ${detail}`, statusMessage);
    Object.setPrototypeOf(this, CrudError.prototype);
  }
}
