import { FindOneOptions } from "typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Company } from "src/modules/companies/entities";
import {
  LoadAppointmentAuthorizationContextQuery,
  LoadCompanyAuthorizationContextQuery,
  LoadExistingPaymentAuthorizationContextQuery,
  LoadWaitListAuthorizationContextQuery,
} from "src/modules/payment-analysis/common/types/authorization";
import { IncomingPaymentWaitList, Payment } from "src/modules/payments-new/entities";
import { EPaymentDirection } from "src/modules/payments-new/common/enums";

export class AuthorizationContextQueryOptionsService {
  public loadAppointmentAuthorizationContextOptions(appointmentId: string): FindOneOptions<Appointment> {
    return {
      select: LoadAppointmentAuthorizationContextQuery.select,
      where: { id: appointmentId },
      relations: LoadAppointmentAuthorizationContextQuery.relations,
    };
  }

  public loadWaitListAuthorizationContextOptions(appointmentId: string): FindOneOptions<IncomingPaymentWaitList> {
    return {
      select: LoadWaitListAuthorizationContextQuery.select,
      where: { appointment: { id: appointmentId } },
    };
  }

  public loadCompanyAuthorizationContextOptions(companyId: string): FindOneOptions<Company> {
    return {
      select: LoadCompanyAuthorizationContextQuery.select,
      where: { id: companyId },
      relations: LoadCompanyAuthorizationContextQuery.relations,
    };
  }

  public loadExistingPaymentAuthorizationContextOptions(appointmentId: string): FindOneOptions<Payment> {
    return {
      select: LoadExistingPaymentAuthorizationContextQuery.select,
      where: { appointment: { id: appointmentId }, direction: EPaymentDirection.INCOMING },
      relations: LoadExistingPaymentAuthorizationContextQuery.relations,
    };
  }
}
