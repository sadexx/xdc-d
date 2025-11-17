import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/modules/users/entities";
import { AdminQueryOptionsService, AdminService } from "src/modules/admin/services";
import { AdminController } from "src/modules/admin/controllers";
import { UserRole } from "src/modules/users/entities";
import { AccountActivationModule } from "src/modules/account-activation/account-activation.module";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { AccessControlModule } from "src/modules/access-control/access-control.module";
import { Payment } from "src/modules/payments/entities";
import { PaymentsModule } from "src/modules/payments/payments.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRole, InterpreterProfile, Payment]),
    AccountActivationModule,
    AccessControlModule,
    PaymentsModule,
  ],
  providers: [AdminService, AdminQueryOptionsService],
  controllers: [AdminController],
})
export class AdminModule {}
