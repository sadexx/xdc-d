import { CallHandler, ExecutionContext, HttpStatus, Injectable, NestInterceptor } from "@nestjs/common";
import { Request, Response } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { PrometheusService } from "src/modules/prometheus/services";

@Injectable()
export class HttpRequestDurationInterceptor<T = unknown> implements NestInterceptor<T, T> {
  constructor(private readonly prometheusService: PrometheusService) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<T> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const method = request.method;
    const route: string = request.route ? (request.route.path as string) : request.path || "unknown";
    const statusCode: number = response.statusCode || HttpStatus.PARTIAL_CONTENT;

    return next.handle().pipe(
      tap(() => {
        const [seconds, nanoseconds] = process.hrtime(request.startTime);
        const SECONDS_TO_NANOSECONDS: number = 1e9;
        const durationInSeconds = seconds + nanoseconds / SECONDS_TO_NANOSECONDS;

        this.prometheusService.recordHttpRequestDuration(method, route, statusCode, durationInSeconds);
      }),
    );
  }
}
