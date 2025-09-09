import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { TokenStrategies } from "src/config/strategies";

@Injectable()
export class JwtRoleSelectionGuard extends AuthGuard(TokenStrategies.JWT_ROLE_SELECTION_STRATEGY) {
  override getRequest(context: ExecutionContext): unknown {
    return context.switchToHttp().getRequest();
  }
}
