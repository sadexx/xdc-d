import { Injectable } from "@nestjs/common";
import { FindOneOptions } from "typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";
import {
  LoadAppointmentCaptureContextQuery,
  LoadInterpreterCompanyCaptureContextQuery,
  LoadPaymentCaptureContextQuery,
} from "src/modules/payments-analysis/common/types/capture";
import { Payment } from "src/modules/payments/entities";
import { ESortOrder } from "src/common/enums";
import { EPaymentDirection } from "src/modules/payments/common/enums/core";
import { Company } from "src/modules/companies/entities";

@Injectable()
export class CaptureContextQueryOptionsService {
  public loadAppointmentCaptureContextOptions(appointmentId: string): FindOneOptions<Appointment> {
    return {
      select: LoadAppointmentCaptureContextQuery.select,
      where: { id: appointmentId },
      relations: LoadAppointmentCaptureContextQuery.relations,
    };
  }

  public loadPaymentCaptureContextOptions(appointmentId: string): FindOneOptions<Payment> {
    return {
      select: LoadPaymentCaptureContextQuery.select,
      where: { appointment: { id: appointmentId }, direction: EPaymentDirection.INCOMING },
      relations: LoadPaymentCaptureContextQuery.relations,
      order: { items: { updatingDate: ESortOrder.ASC } },
    };
  }

  public loadInterpreterCompanyCaptureContextOptions(companyId: string): FindOneOptions<Company> {
    return {
      select: LoadInterpreterCompanyCaptureContextQuery.select,
      where: { id: companyId },
    };
  }
}
