import { Injectable } from "@nestjs/common";
import { FindOneOptions } from "typeorm";
import {
  LoadAppointmentTransferContextQuery,
  LoadCompanyTransferContextQuery,
  LoadPaymentTransferContextQuery,
} from "src/modules/payment-analysis/common/types/transfer";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Company } from "src/modules/companies/entities";
import { Payment } from "src/modules/payments-new/entities";
import { EPaymentDirection } from "src/modules/payments-new/common/enums";

@Injectable()
export class TransferContextQueryOptionsService {
  public loadAppointmentTransferContextOptions(appointmentId: string): FindOneOptions<Appointment> {
    return {
      select: LoadAppointmentTransferContextQuery.select,
      where: { id: appointmentId },
      relations: LoadAppointmentTransferContextQuery.relations,
    };
  }

  public loadCompanyTransferContextOptions(companyId: string): FindOneOptions<Company> {
    return {
      select: LoadCompanyTransferContextQuery.select,
      where: { id: companyId },
      relations: LoadCompanyTransferContextQuery.relations,
    };
  }

  public loadPaymentTransferContextOptions(appointmentId: string): {
    incomingPayment: FindOneOptions<Payment>;
    outcomingPayment: FindOneOptions<Payment>;
  } {
    return {
      incomingPayment: {
        select: LoadPaymentTransferContextQuery.select,
        where: { id: appointmentId, direction: EPaymentDirection.INCOMING },
        relations: LoadPaymentTransferContextQuery.relations,
      },
      outcomingPayment: {
        select: LoadPaymentTransferContextQuery.select,
        where: { id: appointmentId, direction: EPaymentDirection.OUTCOMING },
        relations: LoadPaymentTransferContextQuery.relations,
      },
    };
  }
}
