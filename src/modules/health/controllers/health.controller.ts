import { Controller, Get } from "@nestjs/common";
import { HealthService } from "src/modules/health/services";

@Controller("health-check")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(): string {
    return this.healthService.check();
  }
}
