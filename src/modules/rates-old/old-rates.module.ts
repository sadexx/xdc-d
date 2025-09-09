import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OldRatesService } from "src/modules/rates-old/services";
import { Rate } from "../rates/entities";

@Module({
  imports: [TypeOrmModule.forFeature([Rate])],
  providers: [OldRatesService],
  controllers: [],
  exports: [OldRatesService],
})
export class OldRatesModule {}
