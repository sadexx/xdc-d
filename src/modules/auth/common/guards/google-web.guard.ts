import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuthStrategies } from "src/config/strategies";

@Injectable()
export class GoogleWebGuard extends AuthGuard(AuthStrategies.GOOGLE_WEB_STRATEGY) {}
