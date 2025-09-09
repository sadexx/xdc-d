import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { TokenStrategies } from "src/config/strategies";

@Injectable()
export class JwtResetPasswordGuard extends AuthGuard(TokenStrategies.JWT_RESET_PASSWORD_STRATEGY) {
  override getRequest(context: ExecutionContext): unknown {
    return context.switchToHttp().getRequest();
  }
}
