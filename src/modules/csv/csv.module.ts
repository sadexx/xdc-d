import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CsvBuilderService, CsvQueryOptionsService, CsvService } from "src/modules/csv/services";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { CsvController } from "src/modules/csv/controllers";
import { User } from "src/modules/users/entities";
import { DraftAppointment } from "src/modules/draft-appointments/entities";
import { Company } from "src/modules/companies/entities";
import { UserRole } from "src/modules/users/entities";
import { CsvQueueStorageService } from "src/modules/csv/common/storages";
import { AccessControlModule } from "src/modules/access-control/access-control.module";

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, User, DraftAppointment, Company, UserRole]), AccessControlModule],
  controllers: [CsvController],
  providers: [CsvService, CsvBuilderService, CsvQueryOptionsService, CsvQueueStorageService],
  exports: [CsvService],
})
export class CsvModule {}
