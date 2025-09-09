import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    req.startTime = process.hrtime();
    next();
  }
}
