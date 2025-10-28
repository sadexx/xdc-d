import { ArgumentsHost, Catch, ExceptionFilter, UnauthorizedException } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { LokiLogger } from "src/common/logger";
import { EWebSocketEventTypes } from "src/modules/web-socket-gateway/common/enum";
import { QueryFailedError } from "typeorm";
import { ECommonErrorCodes } from "src/common/enums";

@Catch()
export class WsExceptionFilter implements ExceptionFilter {
  private readonly lokiLogger = new LokiLogger(WsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToWs();
    const client = ctx.getClient<Socket>();
    let status: string = "error";
    let defaultMessage: string = ECommonErrorCodes.UNEXPECTED_ERROR;

    if (exception instanceof WsException) {
      defaultMessage = exception.message;
      client.emit(EWebSocketEventTypes.EXCEPTION, { status, message: defaultMessage });
    } else if (exception instanceof UnauthorizedException) {
      status = "unauthorized";
      defaultMessage = ECommonErrorCodes.UNAUTHORIZED;
      client.emit(EWebSocketEventTypes.EXCEPTION, { status, message: defaultMessage });
    } else if (exception instanceof QueryFailedError) {
      this.lokiLogger.error(`Database error: ${exception.message}`, exception.stack);
      client.emit(EWebSocketEventTypes.EXCEPTION, { status, message: defaultMessage });
    } else {
      client.emit(EWebSocketEventTypes.EXCEPTION, { status, message: defaultMessage });
    }

    if (status !== "unauthorized") {
      this.lokiLogger.error(`WebSocket exception: ${defaultMessage}`, (exception as Error).stack);
    }
  }
}
