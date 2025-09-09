import { Module } from "@nestjs/common";
import { EmailsService } from "src/modules/emails/services";
import { CustomMailerModule } from "src/modules/emails/custom-mailer";

@Module({
  imports: [CustomMailerModule],
  providers: [EmailsService],
  exports: [EmailsService],
})
export class EmailsModule {}
