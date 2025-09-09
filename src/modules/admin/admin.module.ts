import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/modules/users/entities";
import { AdminQueryOptionsService, AdminService } from "src/modules/admin/services";
import { AdminController } from "src/modules/admin/controllers";
import { UserRole } from "src/modules/users/entities";
import { AccountActivationModule } from "src/modules/account-activation/account-activation.module";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { OldPayment } from "src/modules/payments/entities";
import { AccessControlModule } from "src/modules/access-control/access-control.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRole, InterpreterProfile, OldPayment]),
    AccountActivationModule,
    AccessControlModule,
  ],
  providers: [AdminService, AdminQueryOptionsService],
  controllers: [AdminController],
})
export class AdminModule {}
