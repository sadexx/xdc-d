import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Type } from "@nestjs/common";
import { Observable } from "rxjs";
import { Response } from "express";
import { ETokenName } from "src/modules/tokens/common/enums";

export const ClearTokensInterceptor = (
  tokensToClear: ETokenName[] = Object.values(ETokenName),
): Type<NestInterceptor> => {
  @Injectable()
  class TokenClearingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
      const response = context.switchToHttp().getResponse<Response>();

      for (const token of tokensToClear) {
        response.cookie(token, "", { expires: new Date(0), httpOnly: true, secure: true });
      }

      return next.handle();
    }
  }

  return TokenClearingInterceptor;
};
