import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Statistic } from "src/modules/statistics/entities";
import {
  CompanyStatisticsInterpreterController,
  CompanyStatisticsClientController,
  IndividualStatisticsController,
  StatisticsController,
} from "src/modules/statistics/controllers";
import {
  CompanyStatisticsInterpreterService,
  CompanyStatisticsClientService,
  FillStatisticsService,
  IndividualStatisticsService,
  StatisticsService,
} from "src/modules/statistics/services";
import { UserRole } from "src/modules/users/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Company } from "src/modules/companies/entities";
import { MembershipAssignment } from "src/modules/memberships/entities";
import { AccessControlModule } from "src/modules/access-control/access-control.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Statistic, UserRole, Appointment, Company, MembershipAssignment]),
    AccessControlModule,
  ],
  controllers: [
    StatisticsController,
    CompanyStatisticsInterpreterController,
    IndividualStatisticsController,
    CompanyStatisticsClientController,
  ],
  providers: [
    StatisticsService,
    FillStatisticsService,
    CompanyStatisticsInterpreterService,
    IndividualStatisticsService,
    CompanyStatisticsClientService,
  ],
  exports: [FillStatisticsService],
})
export class StatisticsModule {}
