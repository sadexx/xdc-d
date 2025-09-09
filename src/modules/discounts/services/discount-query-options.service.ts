import { Injectable } from "@nestjs/common";
import { Equal, FindOneOptions } from "typeorm";
import {
  ApplyDiscountsForAppointmentQuery,
  CreateOrUpdateDiscountAssociationQuery,
  CreateOrUpdateDiscountHolderQuery,
  FetchDiscountRateQuery,
  GetAssignedDiscountEntitiesQuery,
  TApplyDiscountsForAppointmentValidated,
} from "src/modules/discounts/common/types";
import { DiscountAssociation, DiscountHolder } from "src/modules/discounts/entities";
import { COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { Appointment } from "src/modules/appointments/appointment/entities";

@Injectable()
export class DiscountQueryOptionsService {
  /**
   ** DiscountsService
   */

  public fetchDiscountRateOptions(appointmentId: string): FindOneOptions<DiscountAssociation> {
    return {
      select: FetchDiscountRateQuery.select,
      where: { appointment: Equal(appointmentId) },
    };
  }

  public applyDiscountsForAppointmentOptions(appointmentId: string): FindOneOptions<Appointment> {
    return {
      select: ApplyDiscountsForAppointmentQuery.select,
      where: { id: appointmentId },
      relations: ApplyDiscountsForAppointmentQuery.relations,
    };
  }

  /**
   ** DiscountsFetchService
   */

  public getAssignedDiscountEntitiesOptions(
    client: TApplyDiscountsForAppointmentValidated["client"],
  ): FindOneOptions<DiscountHolder> {
    const whereCondition =
      client.operatedByCompanyId !== COMPANY_LFH_ID
        ? { company: { id: client.operatedByCompanyId } }
        : { userRole: { id: client.id } };

    return {
      select: GetAssignedDiscountEntitiesQuery.select,
      where: whereCondition,
      relations: GetAssignedDiscountEntitiesQuery.relations,
    };
  }

  /**
   ** DiscountHoldersService
   */

  public createOrUpdateDiscountHolderOptions(holderId: string): FindOneOptions<DiscountHolder> {
    return {
      select: CreateOrUpdateDiscountHolderQuery.select,
      where: [{ userRole: { id: holderId } }, { company: { id: holderId } }],
    };
  }

  /**
   ** DiscountAssociationsService
   */

  public createOrUpdateDiscountAssociationOptions(appointmentId: string): FindOneOptions<DiscountAssociation> {
    return {
      select: CreateOrUpdateDiscountAssociationQuery.select,
      where: { appointment: { id: appointmentId } },
    };
  }
}
