import { AuthGuard } from "@nestjs/passport";
import { AuthStrategies } from "src/config/strategies";

export class GoogleMobileGuard extends AuthGuard(AuthStrategies.GOOGLE_MOBILE_STRATEGY) {}
