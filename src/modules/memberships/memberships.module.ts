import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Membership, MembershipAssignment, MembershipPrice } from "src/modules/memberships/entities";
import {
  MembershipAssignmentsService,
  MembershipPaymentsService,
  MembershipsPriceService,
  MembershipsQueryOptionsService,
  MembershipsService,
  MembershipsUsageService,
} from "src/modules/memberships/services";
import { DiscountsModule } from "src/modules/discounts/discounts.module";
import { MembershipsController } from "src/modules/memberships/controllers";
import { EmailsModule } from "src/modules/emails/emails.module";
import { StripeModule } from "src/modules/stripe/stripe.module";
import { OldPayment, OldPaymentItem } from "src/modules/payments/entities";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { PdfModule } from "src/modules/pdf/pdf.module";
import { QueueModule } from "src/modules/queues/queues.module";
import { UserRole } from "src/modules/users/entities";

@Module({
  imports: [
    TypeOrmModule.forFeature([Membership, MembershipPrice, MembershipAssignment, OldPayment, OldPaymentItem, UserRole]),
    forwardRef(() => DiscountsModule),
    StripeModule,
    PdfModule,
    EmailsModule,
    AwsS3Module,
    QueueModule,
  ],
  providers: [
    MembershipsService,
    MembershipAssignmentsService,
    MembershipsQueryOptionsService,
    MembershipsPriceService,
    MembershipPaymentsService,
    MembershipsUsageService,
  ],
  controllers: [MembershipsController],
  exports: [MembershipsService, MembershipAssignmentsService, MembershipPaymentsService, MembershipsUsageService],
})
export class MembershipsModule {}
