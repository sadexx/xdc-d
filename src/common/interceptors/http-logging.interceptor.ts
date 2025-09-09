import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request } from "express";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly lokiLogger = new LokiLogger(HttpLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = Date.now();
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method;
    const url = req.url;

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - now;
          const message = `${method} ${url} ${responseTime}ms`;

          this.lokiLogger.logHttpWithoutPrint(message);
        },
        error: (error: Error) => {
          const responseTime = Date.now() - now;
          const message = `${method} ${url} failed in ${responseTime}ms`;
          this.lokiLogger.errorWithoutPrint(message, error.stack);
        },
      }),
    );
  }
}
