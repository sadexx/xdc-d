import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Setting } from "src/modules/settings/entities";
import { SettingsController } from "src/modules/settings/controllers";
import { SettingsService } from "src/modules/settings/services";
import { RedisModule } from "src/modules/redis/redis.module";

@Module({
  imports: [TypeOrmModule.forFeature([Setting]), RedisModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
