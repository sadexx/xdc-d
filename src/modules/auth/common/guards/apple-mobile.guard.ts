import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuthStrategies } from "src/config/strategies";

@Injectable()
export class AppleMobileGuard extends AuthGuard(AuthStrategies.APPLE_MOBILE_STRATEGY) {}
