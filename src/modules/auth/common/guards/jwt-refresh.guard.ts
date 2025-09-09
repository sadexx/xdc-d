import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { TokenStrategies } from "src/config/strategies";

@Injectable()
export class JwtRefreshGuard extends AuthGuard([
  TokenStrategies.JWT_FULL_REFRESH_STRATEGY,
  TokenStrategies.JWT_ACTIVATION_REFRESH_STRATEGY,
  TokenStrategies.JWT_REQUIRED_INFO_REFRESH_STRATEGY,
]) {
  override getRequest(context: ExecutionContext): unknown {
    return context.switchToHttp().getRequest();
  }
}
