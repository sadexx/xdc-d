import { Injectable } from "@nestjs/common";
import { FindOneOptions } from "typeorm";
import {
  LoadAppointmentTransferContextQuery,
  LoadCompanyTransferContextQuery,
  LoadPaymentTransferContextQuery,
} from "src/modules/payments-analysis/common/types/transfer";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Company } from "src/modules/companies/entities";
import { Payment } from "src/modules/payments/entities";
import { EPaymentDirection } from "src/modules/payments/common/enums/core";

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
        where: { appointment: { id: appointmentId }, direction: EPaymentDirection.INCOMING },
        relations: LoadPaymentTransferContextQuery.relations,
      },
      outcomingPayment: {
        select: LoadPaymentTransferContextQuery.select,
        where: { appointment: { id: appointmentId }, direction: EPaymentDirection.OUTCOMING },
        relations: LoadPaymentTransferContextQuery.relations,
      },
    };
  }
}
