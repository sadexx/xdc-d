import { Injectable } from "@nestjs/common";
import { SelectQueryBuilder, Brackets, FindManyOptions } from "typeorm";
import { DUE_PAYMENT_STATUSES } from "src/common/constants";
import { generateCaseForEnumOrder } from "src/common/utils";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  EPaymentReceiptType,
  paymentMethodFilterMap,
  paymentStatusOrder,
} from "src/modules/payments/common/enums/core";
import { Payment } from "src/modules/payments/entities";
import { GetIndividualPaymentsDto } from "src/modules/payments/common/dto";
import { ESortOrder } from "src/common/enums";

@Injectable()
export class PaymentsQueryOptionsService {
  public getIndividualPaymentsListOptions(
    queryBuilder: SelectQueryBuilder<Payment>,
    dto: GetIndividualPaymentsDto,
    user: ITokenUserData,
    operatedByCompanyId: string | null,
  ): void {
    queryBuilder
      .select([
        "payment.id",
        "payment.platformId",
        "payment.totalFullAmount",
        "payment.totalGstAmount",
        "payment.currency",
        "payment.paymentMethodInfo",
        "payment.receipt",
        "payment.taxInvoice",
        "payment.isDepositCharge",
        "payment.membershipId",
        "payment.updatingDate",
      ])
      .leftJoin("payment.appointment", "appointment")
      .addSelect([
        "appointment.id",
        "appointment.platformId",
        "appointment.scheduledStartTime",
        "appointment.businessStartTime",
      ])
      .leftJoin("payment.fromClient", "fromClient")
      .addSelect("fromClient.id")
      .leftJoin("fromClient.user", "user")
      .addSelect(["user.id", "user.platformId"])
      .leftJoin("payment.toInterpreter", "toInterpreter")
      .addSelect("toInterpreter.id")
      .leftJoin("payment.company", "company")
      .addSelect(["company.id", "company.platformId"])
      .leftJoin("payment.items", "item")
      .addSelect([
        "item.id",
        "item.amount",
        "item.gstAmount",
        "item.fullAmount",
        "item.currency",
        "item.status",
        "item.receipt",
        "item.creationDate",
        "item.updatingDate",
      ])
      .orderBy("item.updatingDate", ESortOrder.ASC);

    if (operatedByCompanyId) {
      queryBuilder.andWhere("company.id = :companyId", { companyId: operatedByCompanyId });
    } else {
      queryBuilder.andWhere("(fromClient.id = :userRoleId OR toInterpreter.id = :userRoleId)", {
        userRoleId: user.userRoleId,
      });
    }

    if (dto.receiptType === EPaymentReceiptType.TAX_INVOICE) {
      queryBuilder.andWhere("payment.totalGstAmount > 0");
    }

    this.applyFiltersForUserPayments(queryBuilder, dto);
    this.applyOrderingForUserPayments(queryBuilder, dto);
    queryBuilder.take(dto.limit);
    queryBuilder.skip(dto.offset);
  }

  private applyFiltersForUserPayments(queryBuilder: SelectQueryBuilder<Payment>, dto: GetIndividualPaymentsDto): void {
    if (dto.searchField) {
      this.applySearchForUserPayments(queryBuilder, dto.searchField);
    }

    if (dto.paymentMethod) {
      const paymentMethod = paymentMethodFilterMap[dto.paymentMethod];
      queryBuilder.andWhere("payment.paymentMethodInfo LIKE :paymentMethod", {
        paymentMethod: `%${paymentMethod}%`,
      });
    }

    if (dto.statuses?.length) {
      const lastStatusCase = `
				(SELECT item.status
					FROM payment_items item
					WHERE item.payment_id = payment.id
					ORDER BY item.updating_date DESC
					LIMIT 1)
				`;
      queryBuilder.andWhere(`${lastStatusCase} IN (:...statuses)`, { statuses: dto.statuses });
    }

    if (dto.startDate && dto.endDate) {
      queryBuilder.andWhere("DATE(appointment.scheduledStartTime) BETWEEN :startDate::date AND :endDate::date", {
        startDate: dto.startDate,
        endDate: dto.endDate,
      });
    }
  }

  private applySearchForUserPayments(queryBuilder: SelectQueryBuilder<Payment>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("appointment.platformId ILIKE :search", { search: searchTerm })
          .orWhere("company.platformId ILIKE :search", { search: searchTerm })
          .orWhere("user.platformId ILIKE :search", { search: searchTerm })
          .orWhere("CAST(payment.totalFullAmount AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(payment.totalGstAmount AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(item.status AS TEXT) ILIKE :search", { search: searchTerm });
      }),
    );
  }

  private applyOrderingForUserPayments(queryBuilder: SelectQueryBuilder<Payment>, dto: GetIndividualPaymentsDto): void {
    if (dto.sortOrder) {
      queryBuilder.addOrderBy("payment.updatingDate", dto.sortOrder);
    }

    if (dto.appointmentDateOrder) {
      queryBuilder.addOrderBy("appointment.scheduledStartTime", dto.appointmentDateOrder);
    }

    if (dto.amountOrder) {
      const orderField =
        dto.receiptType === EPaymentReceiptType.TAX_INVOICE ? "payment.totalGstAmount" : "payment.totalFullAmount";
      queryBuilder.addOrderBy(orderField, dto.amountOrder);
    }

    if (dto.dueDateOrder) {
      const lastDueItemDateCase = `
				(SELECT item.updating_date
					FROM payment_items item
					WHERE item.payment_id = payment.id
						AND item.status IN (:...dueStatuses)
					ORDER BY item.updatingDate DESC
					LIMIT 1)
				`;
      queryBuilder.addSelect(lastDueItemDateCase, "due_date_order");
      queryBuilder.addOrderBy("due_date_order", dto.dueDateOrder);
      queryBuilder.setParameter("dueStatuses", DUE_PAYMENT_STATUSES);
    }

    if (dto.statusOrder) {
      const lastStatusSQL = `
				(SELECT item.status
					FROM payment_items item
					WHERE item.payment_id = payment.id
					ORDER BY item.updating_date DESC
					LIMIT 1)
				`;
      const caseStatement = generateCaseForEnumOrder(lastStatusSQL, paymentStatusOrder);
      queryBuilder.addSelect(caseStatement, "item_status_order");
      queryBuilder.addOrderBy("item_status_order", dto.statusOrder);
    }

    if (dto.invoiceNumberOrder) {
      const invoiceNumberCase = `
					CASE
						WHEN payment.membershipId IS NOT NULL AND payment.fromClient IS NOT NULL
							THEN CONCAT(user.platform_id, '-', payment.platform_id)
						WHEN payment.isDepositCharge = true AND company.id IS NOT NULL
							THEN CONCAT(company.platform_id, '-', payment.platform_id)
						ELSE appointment.platform_id
					END
				`;
      queryBuilder.addSelect(invoiceNumberCase, "invoice_number_order");
      queryBuilder.addOrderBy("invoice_number_order", dto.invoiceNumberOrder);
    }
  }

  public downloadReceiptOptions(receiptKey: string): FindManyOptions<Payment> {
    return {
      where: [{ receipt: receiptKey }, { taxInvoice: receiptKey }, { items: { receipt: receiptKey } }],
    };
  }
}
