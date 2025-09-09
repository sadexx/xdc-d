import { ArgumentsHost, Catch, ExceptionFilter, UnauthorizedException } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { LokiLogger } from "src/common/logger";

@Catch()
export class WsExceptionFilter implements ExceptionFilter {
  private readonly lokiLogger = new LokiLogger(WsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToWs();
    const client = ctx.getClient<Socket>();
    let status: string = "error";
    let message: string | object = "Unexpected error occurred";

    if (exception instanceof WsException) {
      message = exception.message;
      client.emit("exception", { status: "error", message });
    } else if (exception instanceof UnauthorizedException) {
      status = "unauthorized";
      message = exception.message || "Unauthorized";
      client.emit("exception", { status: "unauthorized", message });
    } else if (exception instanceof Error) {
      message = exception.message;
      client.emit("exception", { status: "error", message });
    } else {
      message = "Unexpected error occurred";
      client.emit("exception", { status: "error", message });
    }

    if (status !== "unauthorized") {
      this.lokiLogger.error(`Exception caught: ${message}`, (exception as Error).stack);
    }
  }
}
