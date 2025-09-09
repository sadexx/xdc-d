import { Module } from "@nestjs/common";
import { HealthService } from "src/modules/health/services";
import { HealthController } from "src/modules/health/controllers";

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
