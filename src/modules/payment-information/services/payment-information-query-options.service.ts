import { Injectable } from "@nestjs/common";
import { FindOptionsWhere, In } from "typeorm";
import { CONFLICT_APPOINTMENT_CONFIRMED_STATUSES } from "src/modules/appointments/shared/common/constants";
import { Appointment } from "src/modules/appointments/appointment/entities";

@Injectable()
export class PaymentInformationQueryOptionsService {
  public getCheckPaymentMethodDeletionPossibilityOptions(
    userRoleId?: string,
    companyId?: string,
  ): FindOptionsWhere<Appointment>[] {
    let notEndedAppointmentsCountWhere: FindOptionsWhere<Appointment>[] = [];

    if (userRoleId) {
      notEndedAppointmentsCountWhere = [
        { clientId: userRoleId, status: In(CONFLICT_APPOINTMENT_CONFIRMED_STATUSES) },
        { interpreterId: userRoleId, status: In(CONFLICT_APPOINTMENT_CONFIRMED_STATUSES) },
      ];
    }

    if (companyId) {
      notEndedAppointmentsCountWhere = [
        { client: { operatedByCompanyId: companyId }, status: In(CONFLICT_APPOINTMENT_CONFIRMED_STATUSES) },
        {
          client: { operatedByMainCorporateCompanyId: companyId },
          status: In(CONFLICT_APPOINTMENT_CONFIRMED_STATUSES),
        },
        { interpreter: { operatedByCompanyId: companyId }, status: In(CONFLICT_APPOINTMENT_CONFIRMED_STATUSES) },
        {
          interpreter: { operatedByMainCorporateCompanyId: companyId },
          status: In(CONFLICT_APPOINTMENT_CONFIRMED_STATUSES),
        },
      ];
    }

    return notEndedAppointmentsCountWhere;
  }
}
