import { Injectable } from "@nestjs/common";
import { FindOneOptions } from "typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";
import {
  LoadAppointmentAuthorizationCancelContextQuery,
  LoadCompanyAuthorizationCancelContextQuery,
  LoadPaymentAuthorizationCancelContextQuery,
} from "src/modules/payments-analysis/common/types/authorization-cancel";
import { Company } from "src/modules/companies/entities";
import { Payment } from "src/modules/payments/entities";
import { EPaymentDirection } from "src/modules/payments/common/enums/core";

@Injectable()
export class AuthorizationCancelContextQueryOptionsService {
  public loadAppointmentAuthorizationCancelContextOptions(appointmentId: string): FindOneOptions<Appointment> {
    return {
      select: LoadAppointmentAuthorizationCancelContextQuery.select,
      where: { id: appointmentId },
      relations: LoadAppointmentAuthorizationCancelContextQuery.relations,
    };
  }

  public loadPaymentAuthorizationCancelContextOptions(appointmentId: string): FindOneOptions<Payment> {
    return {
      select: LoadPaymentAuthorizationCancelContextQuery.select,
      where: { appointment: { id: appointmentId }, direction: EPaymentDirection.INCOMING },
      relations: LoadPaymentAuthorizationCancelContextQuery.relations,
    };
  }

  public loadCompanyAuthorizationCancelContextOptions(companyId: string): FindOneOptions<Company> {
    return {
      select: LoadCompanyAuthorizationCancelContextQuery.select,
      where: { id: companyId },
    };
  }
}
