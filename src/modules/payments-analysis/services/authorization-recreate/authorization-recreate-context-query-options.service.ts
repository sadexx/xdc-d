import { Injectable } from "@nestjs/common";
import { FindOneOptions } from "typeorm";
import {
  LoadAppointmentAuthorizationRecreateContextQuery,
  LoadCompanyAuthorizationRecreateContextQuery,
  LoadOldPaymentAuthorizationRecreateContextQuery,
} from "src/modules/payments-analysis/common/types/authorization-recreate";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Company } from "src/modules/companies/entities";
import { Payment } from "src/modules/payments/entities";
import { EPaymentDirection } from "src/modules/payments/common/enums/core";

@Injectable()
export class AuthorizationRecreateContextQueryOptions {
  public loadAppointmentAuthorizationRecreateContextOptions(appointmentId: string): FindOneOptions<Appointment> {
    return {
      select: LoadAppointmentAuthorizationRecreateContextQuery.select,
      where: { id: appointmentId },
      relations: LoadAppointmentAuthorizationRecreateContextQuery.relations,
    };
  }

  public loadCompanyAuthorizationRecreateContextOptions(companyId: string): FindOneOptions<Company> {
    return {
      select: LoadCompanyAuthorizationRecreateContextQuery.select,
      where: { id: companyId },
    };
  }

  public loadOldPaymentAuthorizationRecreateContextOptions(oldAppointmentId: string): FindOneOptions<Payment> {
    return {
      select: LoadOldPaymentAuthorizationRecreateContextQuery.select,
      where: { appointment: { id: oldAppointmentId }, direction: EPaymentDirection.INCOMING },
      relations: LoadOldPaymentAuthorizationRecreateContextQuery.relations,
    };
  }
}
