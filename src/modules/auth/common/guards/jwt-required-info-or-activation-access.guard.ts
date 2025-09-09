import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { TokenStrategies } from "src/config/strategies";

@Injectable()
export class JwtRequiredInfoOrActivationAccessGuard extends AuthGuard([
  TokenStrategies.JWT_REQUIRED_INFO_ACCESS_STRATEGY,
  TokenStrategies.JWT_ACTIVATION_ACCESS_STRATEGY,
]) {
  override getRequest(context: ExecutionContext): unknown {
    return context.switchToHttp().getRequest();
  }
}
