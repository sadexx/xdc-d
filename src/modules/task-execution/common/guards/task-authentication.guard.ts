import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { createHmac } from "node:crypto";
import { NUMBER_OF_MILLISECONDS_IN_MINUTE, NUMBER_OF_MINUTES_IN_TWO_MINUTES } from "src/common/constants";

@Injectable()
export class TaskAuthenticationGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    try {
      const apiKey = request.headers["x-api-key"] as string;
      const signature = request.headers["x-request-signature"] as string;
      const timestamp = request.headers["x-request-timestamp"] as string;

      if (!apiKey || !signature || !timestamp) {
        return false;
      }

      const validApiKey = this.configService.getOrThrow<string>("internalApiKey");

      if (apiKey !== validApiKey) {
        return false;
      }

      const requestTime = new Date(timestamp);
      const currentTime = new Date();

      if (
        Math.abs(currentTime.getTime() - requestTime.getTime()) >
        NUMBER_OF_MINUTES_IN_TWO_MINUTES * NUMBER_OF_MILLISECONDS_IN_MINUTE
      ) {
        return false;
      }

      const secret = this.configService.getOrThrow<string>("internalApiSecret");

      const calculatedSignature = createHmac("sha256", secret)
        .update(JSON.stringify({ ...request.body, timestamp }))
        .digest("hex");

      return signature === calculatedSignature;
    } catch {
      return false;
    }
  }
}
