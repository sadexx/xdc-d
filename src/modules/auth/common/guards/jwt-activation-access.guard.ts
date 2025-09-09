import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { TokenStrategies } from "src/config/strategies";

@Injectable()
export class JwtActivationAccessGuard extends AuthGuard(TokenStrategies.JWT_ACTIVATION_ACCESS_STRATEGY) {
  override getRequest(context: ExecutionContext): unknown {
    return context.switchToHttp().getRequest();
  }
}
