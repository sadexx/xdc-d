import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";
import { PrometheusService } from "src/modules/prometheus/services";
import { QueryFailedError } from "typeorm";
import { IErrorResponse } from "src/common/interfaces";
import { LokiLogger } from "src/common/logger";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly lokiLogger = new LokiLogger(GlobalExceptionFilter.name);
  constructor(private readonly prometheusService: PrometheusService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    let status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let defaultMessage: string = "Unexpected error occurred";
    let exceptionResponse: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      exceptionResponse = exception.getResponse();
    }

    if (exception instanceof QueryFailedError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      this.lokiLogger.error(`Database error: ${exception.message}`, exception.stack);
      defaultMessage = "Database Error";
    }

    const responseErrorBody = this.buildErrorResponse(status, request.url, defaultMessage, exceptionResponse);

    if (status !== HttpStatus.UNAUTHORIZED && status !== HttpStatus.NOT_FOUND) {
      this.lokiLogger.error(JSON.stringify(responseErrorBody.message), (exception as Error).stack);
    }

    this.recordErrorMetrics(request, status);

    response.status(status).json(responseErrorBody);
  }

  private recordErrorMetrics(request: Request, statusCode: number): void {
    const method = request.method;
    const route: string =
      request.route && request.route.path && request.path.startsWith("/v1") ? (request.route.path as string) : "scam";

    const [seconds, nanoseconds] = process.hrtime(request.startTime);
    const secondsToNanoseconds: number = 1e9;
    const durationInSeconds = seconds + nanoseconds / secondsToNanoseconds;

    this.prometheusService.recordHttpRequestDuration(method, route, statusCode, durationInSeconds);
  }

  private buildErrorResponse(
    statusCode: number,
    path: string,
    defaultMessage: string,
    exceptionResponse: unknown,
  ): IErrorResponse {
    const baseResponse: IErrorResponse = {
      statusCode: statusCode,
      timestamp: new Date().toISOString(),
      path: path,
      message: defaultMessage,
    };

    if (exceptionResponse && typeof exceptionResponse === "object") {
      const responseObj = exceptionResponse as Record<string, unknown>;

      if (typeof responseObj.message === "string") {
        baseResponse.message = responseObj.message;
      }

      if (Array.isArray(responseObj.message)) {
        baseResponse.message = responseObj.message;
      }

      if (Array.isArray(responseObj.conflictingAppointments)) {
        baseResponse.conflictingAppointments = responseObj.conflictingAppointments;
      }

      if (Array.isArray(responseObj.uncompletedAppointmentStatuses)) {
        baseResponse.uncompletedAppointmentStatuses = responseObj.uncompletedAppointmentStatuses;
      }

      if (typeof responseObj.isPromoAssigned === "boolean") {
        baseResponse.isPromoAssigned = responseObj.isPromoAssigned;
      }
    } else if (typeof exceptionResponse === "string") {
      baseResponse.message = exceptionResponse;
    }

    return baseResponse;
  }
}
