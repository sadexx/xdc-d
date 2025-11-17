import { User, UserRole } from "src/modules/users/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Company } from "src/modules/companies/entities";
import { Payment } from "src/modules/payments/entities";
import { NonNullableProperties, StrictOmit } from "src/common/types";
import { ICreatePaymentRecord } from "src/modules/payments/common/interfaces/management";

/**
 ** Type
 */

export type TCreatePaymentRecordClient = Pick<UserRole, "id"> & { user: Pick<User, "platformId"> };

export type TCreatePaymentRecordInterpreter = Pick<UserRole, "id">;

export type TCreatePaymentRecordAppointment = Pick<Appointment, "platformId">;

export type TCreatePaymentRecordCompany = Pick<Company, "platformId">;

export type TCreatePaymentRecordPayment = StrictOmit<
  Pick<Payment, "id" | "totalAmount" | "totalGstAmount" | "totalFullAmount">,
  "totalAmount" | "totalGstAmount" | "totalFullAmount"
> & {
  totalAmount: number;
  totalGstAmount: number;
  totalFullAmount: number;
};

export type TConstructPaymentDto = NonNullableProperties<
  ICreatePaymentRecord,
  "direction" | "customerType" | "system" | "paymentMethodInfo"
>;
