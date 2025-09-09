import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuthStrategies } from "src/config/strategies";

@Injectable()
export class AppleWebGuard extends AuthGuard(AuthStrategies.APPLE_WEB_STRATEGY) {}
