import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, FindOptionsWhere, In, Repository } from "typeorm";
import {
  EChartLine,
  EChartsHomepageLine,
  ECorporateInterpreterSubordinatesTypes,
} from "src/modules/statistics/common/enums";
import {
  GetAppointmentsByLanguageAndCompanyDto,
  GetCancelledAppointmentByInterpreterCompanyDto,
  GetCreatedVsCompletedAppointmentsByTypeAndCompanyDto,
  GetCreatedVsCompletedAppointmentsByTypeAndInterpreterCompanyDto,
  GetHomepageBaseAppointmentStatisticByCompanyDto,
  GetRejectedVsAcceptedAppointmentsByCompanyDto,
} from "src/modules/statistics/common/dto";
import { Appointment } from "src/modules/appointments/appointment/entities";
import {
  EAppointmentCommunicationType,
  EAppointmentSchedulingType,
  EAppointmentStatus,
} from "src/modules/appointments/appointment/common/enums";
import { StatisticsService } from "src/modules/statistics/services";
import { APPOINTMENT_TYPE_CRITERIA } from "src/modules/statistics/common/constants/constants";
import { EUserRoleName } from "src/modules/users/common/enums";
import { Company } from "src/modules/companies/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { INTERPRETER_ROLES, UNDEFINED_VALUE } from "src/common/constants";
import {
  IChartLineDataOutput,
  IGetHomepageBaseAppointmentStatisticOutput,
  IChartHomepageLineDataOutput,
} from "src/modules/statistics/common/outputs";
import { AccessControlService } from "src/modules/access-control/services";

@Injectable()
export class CompanyStatisticsInterpreterService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly statisticsService: StatisticsService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async getCreatedVsCompletedAppointmentsOfClientsByTypeAndInterpreterCompany(
    dto: GetCreatedVsCompletedAppointmentsByTypeAndCompanyDto,
    user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const subordinateCompanies = await this.companyRepository.find({
      where: { operatedByMainCompanyId: dto.companyId },
      select: { id: true, operatedByMainCompanyId: true },
    });

    const subordinateCompaniesIds = subordinateCompanies.map((subordinateCompany) => {
      return subordinateCompany.id;
    });

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const createdChartLine: EChartLine = EChartLine.CREATED_APPOINTMENTS;
    const completedChartLine: EChartLine = EChartLine.COMPLETED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineDataOutput = {
      [createdChartLine]: { values: [], labels: [] },
      [completedChartLine]: { values: [], labels: [] },
    };

    for (const appointmentType of dto.appointmentTypes) {
      const resultByType: IChartLineDataOutput = {
        [createdChartLine]: { values: [], labels: [] },
        [completedChartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        const [createdCount, completedCount] = await Promise.all([
          this.appointmentRepository.count({
            where: {
              ...APPOINTMENT_TYPE_CRITERIA[appointmentType],
              creationDate: Between(period.startPeriod, period.endPeriod),
              client: {
                operatedByCompanyId: In(subordinateCompaniesIds),
              },
            },
          }),
          this.appointmentRepository.count({
            where: {
              ...APPOINTMENT_TYPE_CRITERIA[appointmentType],
              updatingDate: Between(period.startPeriod, period.endPeriod),
              status: In([EAppointmentStatus.COMPLETED]),
              client: {
                operatedByCompanyId: In(subordinateCompaniesIds),
              },
            },
          }),
        ]);

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[createdChartLine]?.values.push(createdCount);
        resultByType[createdChartLine]?.labels.push(formatDay);
        resultByType[completedChartLine]?.values.push(completedCount);
        resultByType[completedChartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, createdChartLine);
      result = this.statisticsService.updateResultFromArray(resultByType, result, completedChartLine);
    }

    return result;
  }

  public async getCreatedVsCompletedAppointmentsOfClientsByLanguageAndInterpreterCompany(
    dto: GetAppointmentsByLanguageAndCompanyDto,
    user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const subordinateCompanies = await this.companyRepository.find({
      where: { operatedByMainCompanyId: dto.companyId },
      select: { id: true, operatedByMainCompanyId: true },
    });

    const subordinateCompaniesIds = subordinateCompanies.map((subordinateCompany) => {
      return subordinateCompany.id;
    });

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const createdChartLine: EChartLine = EChartLine.CREATED_APPOINTMENTS;
    const completedChartLine: EChartLine = EChartLine.COMPLETED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    const result: IChartLineDataOutput = {
      [createdChartLine]: { values: [], labels: [] },
      [completedChartLine]: { values: [], labels: [] },
    };

    for (const [index, period] of dates.entries()) {
      const [createdCount, completedCount] = await Promise.all([
        this.appointmentRepository.count({
          where: {
            languageFrom: dto.languageFrom,
            languageTo: dto.languageTo,
            creationDate: Between(period.startPeriod, period.endPeriod),
            client: {
              operatedByCompanyId: In(subordinateCompaniesIds),
            },
          },
        }),
        this.appointmentRepository.count({
          where: {
            languageFrom: dto.languageFrom,
            languageTo: dto.languageTo,
            updatingDate: Between(period.startPeriod, period.endPeriod),
            status: In([EAppointmentStatus.COMPLETED]),
            client: {
              operatedByCompanyId: In(subordinateCompaniesIds),
            },
          },
        }),
      ]);

      const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

      result[createdChartLine]?.values.push(createdCount);
      result[createdChartLine]?.labels.push(formatDay);
      result[completedChartLine]?.values.push(completedCount);
      result[completedChartLine]?.labels.push(formatDay);
    }

    return result;
  }

  public async getAppointmentsDurationByInterpreterCompany(
    dto: GetCreatedVsCompletedAppointmentsByTypeAndInterpreterCompanyDto,
    user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.APPOINTMENTS_DURATION;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineDataOutput = {
      [chartLine]: { values: [], labels: [] },
    };

    for (const appointmentType of dto.appointmentTypes) {
      const resultByType: IChartLineDataOutput = {
        [chartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        let avgDuration: number = 0;
        let query: string = "";

        if (dto.corporateInterpreterSubordinatesType === ECorporateInterpreterSubordinatesTypes.CORPORATE_CLIENTS) {
          const subordinateCompanies = await this.companyRepository.find({
            where: { operatedByMainCompanyId: dto.companyId },
            select: { id: true, operatedByMainCompanyId: true },
          });

          const subordinateCompaniesIds = subordinateCompanies.map((subordinateCompany) => {
            return subordinateCompany.id;
          });

          query = this.statisticsService.getAppointmentDurationQuery(
            appointmentType,
            period.startPeriod,
            period.endPeriod,
            APPOINTMENT_TYPE_CRITERIA[appointmentType],
            UNDEFINED_VALUE,
            UNDEFINED_VALUE,
            subordinateCompaniesIds,
          );
        } else if (
          dto.corporateInterpreterSubordinatesType ===
          ECorporateInterpreterSubordinatesTypes.CORPORATE_INDIVIDUAL_INTERPRETERS
        ) {
          query = this.statisticsService.getAppointmentDurationQuery(
            appointmentType,
            period.startPeriod,
            period.endPeriod,
            APPOINTMENT_TYPE_CRITERIA[appointmentType],
            UNDEFINED_VALUE,
            UNDEFINED_VALUE,
            UNDEFINED_VALUE,
            dto.companyId,
          );
        } else {
          const subordinateCompanies = await this.companyRepository.find({
            where: { operatedByMainCompanyId: dto.companyId },
            select: { id: true, operatedByMainCompanyId: true },
          });

          const subordinateCompaniesIds = subordinateCompanies.map((subordinateCompany) => {
            return subordinateCompany.id;
          });

          query = this.statisticsService.getAppointmentDurationQuery(
            appointmentType,
            period.startPeriod,
            period.endPeriod,
            APPOINTMENT_TYPE_CRITERIA[appointmentType],
            UNDEFINED_VALUE,
            UNDEFINED_VALUE,
            subordinateCompaniesIds,
            dto.companyId,
          );
        }

        const avgDiffMinutes: [{ avg_diff_minutes: string }] = await this.appointmentRepository.query(query);

        if (avgDiffMinutes[0].avg_diff_minutes) {
          avgDuration = Math.round(Number(avgDiffMinutes[0].avg_diff_minutes));
        }

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[chartLine]?.values.push(avgDuration);
        resultByType[chartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, chartLine);
    }

    return result;
  }

  public async getCancelledClientsAppointmentsByInterpreterCompany(
    dto: GetCancelledAppointmentByInterpreterCompanyDto,
    user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const subordinateCompanies = await this.companyRepository.find({
      where: { operatedByMainCompanyId: dto.companyId },
      select: { id: true, operatedByMainCompanyId: true },
    });

    const subordinateCompaniesIds = subordinateCompanies.map((subordinateCompany) => {
      return subordinateCompany.id;
    });

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.CANCELLED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineDataOutput = {
      [chartLine]: { values: [], labels: [] },
    };

    for (const appointmentType of dto.appointmentTypes) {
      const resultByType: IChartLineDataOutput = {
        [chartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        const canceledCount = await this.appointmentRepository.count({
          where: {
            ...APPOINTMENT_TYPE_CRITERIA[appointmentType],
            appointmentAdminInfo: {
              cancellations: {
                creationDate: Between(period.startPeriod, period.endPeriod),
              },
            },
            client: {
              operatedByCompanyId: In(subordinateCompaniesIds),
            },
          },
        });

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[chartLine]?.values.push(canceledCount);
        resultByType[chartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, chartLine);
    }

    return result;
  }

  public async getCompletedAppointmentsByTypeAndInterpreterCompany(
    dto: GetCreatedVsCompletedAppointmentsByTypeAndCompanyDto,
    user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.COMPLETED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineDataOutput = {
      [chartLine]: { values: [], labels: [] },
    };

    for (const appointmentType of dto.appointmentTypes) {
      const resultByType: IChartLineDataOutput = {
        [chartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        const completedCount = await this.appointmentRepository.count({
          where: {
            ...APPOINTMENT_TYPE_CRITERIA[appointmentType],
            updatingDate: Between(period.startPeriod, period.endPeriod),
            status: In([EAppointmentStatus.COMPLETED]),
            interpreter: {
              operatedByCompanyId: dto.companyId,
            },
          },
        });

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[chartLine]?.values.push(completedCount);
        resultByType[chartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, chartLine);
    }

    return result;
  }

  public async getCancelledInterpretersAppointmentsByInterpreterCompany(
    dto: GetCancelledAppointmentByInterpreterCompanyDto,
    user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.CANCELLED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineDataOutput = {
      [chartLine]: { values: [], labels: [] },
    };

    for (const appointmentType of dto.appointmentTypes) {
      const resultByType: IChartLineDataOutput = {
        [chartLine]: { values: [], labels: [] },
      };

      let communicationTypeQuery = "";

      if (APPOINTMENT_TYPE_CRITERIA[appointmentType].communicationType) {
        communicationTypeQuery = `AND communication_type = '${APPOINTMENT_TYPE_CRITERIA[appointmentType].communicationType}' `;
      }

      let schedulingTypeQuery = "";

      if (APPOINTMENT_TYPE_CRITERIA[appointmentType].schedulingType) {
        schedulingTypeQuery = `AND scheduling_type = '${APPOINTMENT_TYPE_CRITERIA[appointmentType].schedulingType}' `;
      }

      for (const [index, period] of dates.entries()) {
        const canceledCount: [{ appointment_count: number }] = await this.appointmentRepository.query(
          "SELECT COUNT(appointments.id) AS appointment_count " +
            "FROM appointments " +
            "JOIN appointments_admin_info appointments_admin_info ON appointments.id = appointments_admin_info.appointment_id " +
            "JOIN appointments_cancellation_info ON appointments_admin_info.id = appointments_cancellation_info.appointment_admin_info_id " +
            "JOIN user_roles ON appointments_cancellation_info.cancelled_by_id = user_roles.id " +
            `WHERE user_roles.operated_by_company_id = '${dto.companyId}' ` +
            communicationTypeQuery +
            schedulingTypeQuery +
            `AND appointments_cancellation_info.role_name = '${EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER}';`,
        );

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[chartLine]?.values.push(canceledCount[0].appointment_count);
        resultByType[chartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, chartLine);
    }

    return result;
  }

  public async getHomepageBaseAppointmentInfoByCompanyId(
    dto: GetHomepageBaseAppointmentStatisticByCompanyDto,
    user: ITokenUserData,
  ): Promise<IGetHomepageBaseAppointmentStatisticOutput> {
    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);

    const appointmentCountWhere: FindOptionsWhere<Appointment> = {
      updatingDate: Between(dateFrom, dateTo),
      status: In([EAppointmentStatus.COMPLETED]),
      interpreter: {
        operatedByCompanyId: dto.companyId,
      },
    };

    const appointmentDurationQuery =
      "SELECT SUM( " +
      "CASE " +
      `WHEN appointments.communication_type = '${EAppointmentCommunicationType.FACE_TO_FACE}' THEN EXTRACT(EPOCH FROM (appointments.business_end_time - appointments.scheduled_start_time)) / 60 ` +
      "ELSE " +
      "CASE " +
      "WHEN appointments.client_last_active_time IS NULL THEN 0 " +
      "WHEN appointments.client_last_active_time < appointments.scheduled_start_time THEN 0 " +
      "ELSE EXTRACT(EPOCH FROM (appointments.client_last_active_time - appointments.scheduled_start_time)) / 60 " +
      "END " +
      "END " +
      ") AS total_duration_in_minutes " +
      "FROM appointments " +
      "JOIN user_roles ON appointments.interpreter_id = user_roles.id " +
      `WHERE user_roles.operated_by_company_id = '${dto.companyId}' ` +
      `AND appointments.status IN ('${EAppointmentStatus.COMPLETED}') `;

    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const onDemandCount = await this.appointmentRepository.count({
      where: {
        ...appointmentCountWhere,
        schedulingType: EAppointmentSchedulingType.ON_DEMAND,
      },
    });

    const preBookedCount = await this.appointmentRepository.count({
      where: {
        ...appointmentCountWhere,
        schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
      },
    });

    const [onDemandDuration]: [{ total_duration_in_minutes: string }] = await this.appointmentRepository.query(
      appointmentDurationQuery + `AND appointments.scheduling_type = '${EAppointmentSchedulingType.ON_DEMAND}';`,
    );

    const [preBookedDuration]: [{ total_duration_in_minutes: string }] = await this.appointmentRepository.query(
      appointmentDurationQuery + `AND appointments.scheduling_type = '${EAppointmentSchedulingType.PRE_BOOKED}';`,
    );

    return {
      all: {
        count: onDemandCount + preBookedCount,
        duration:
          Number(onDemandDuration.total_duration_in_minutes) + Number(preBookedDuration.total_duration_in_minutes),
      },
      onDemand: {
        count: onDemandCount,
        duration: Number(onDemandDuration.total_duration_in_minutes),
      },
      preBooked: {
        count: preBookedCount,
        duration: Number(preBookedDuration.total_duration_in_minutes),
      },
    };
  }

  public async getHomepageChartsAppointmentInfoByCompanyId(
    dto: GetHomepageBaseAppointmentStatisticByCompanyDto,
    user: ITokenUserData,
  ): Promise<IChartHomepageLineDataOutput> {
    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const allChartLine: EChartsHomepageLine = EChartsHomepageLine.COMPLETED_APPOINTMENTS_ALL;
    const onDemandChartLine: EChartsHomepageLine = EChartsHomepageLine.COMPLETED_APPOINTMENTS_ON_DEMAND;
    const preBookedChartLine: EChartsHomepageLine = EChartsHomepageLine.COMPLETED_APPOINTMENTS_PRE_BOOKED;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    const result: IChartHomepageLineDataOutput = {
      [allChartLine]: { values: [], labels: [] },
      [onDemandChartLine]: { values: [], labels: [] },
      [preBookedChartLine]: { values: [], labels: [] },
    };

    const appointmentCountWhere: FindOptionsWhere<Appointment> = {
      status: In([EAppointmentStatus.COMPLETED]),
      interpreter: {
        operatedByCompanyId: dto.companyId,
      },
    };

    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    for (const [index, period] of dates.entries()) {
      const [allCount, onDemandCount, preBookedCount] = await Promise.all([
        this.appointmentRepository.count({
          where: {
            ...appointmentCountWhere,
            creationDate: Between(period.startPeriod, period.endPeriod),
          },
        }),
        this.appointmentRepository.count({
          where: {
            ...appointmentCountWhere,
            creationDate: Between(period.startPeriod, period.endPeriod),
            schedulingType: EAppointmentSchedulingType.ON_DEMAND,
          },
        }),
        this.appointmentRepository.count({
          where: {
            ...appointmentCountWhere,
            creationDate: Between(period.startPeriod, period.endPeriod),
            schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
          },
        }),
      ]);

      const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

      result[allChartLine]?.values.push(allCount);
      result[allChartLine]?.labels.push(formatDay);
      result[onDemandChartLine]?.values.push(onDemandCount);
      result[onDemandChartLine]?.labels.push(formatDay);
      result[preBookedChartLine]?.values.push(preBookedCount);
      result[preBookedChartLine]?.labels.push(formatDay);
    }

    return result;
  }

  public async getRejectedVsAcceptedAppointmentsByInterpreterAndCompany(
    dto: GetRejectedVsAcceptedAppointmentsByCompanyDto,
    user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const subordinateCompanies = await this.companyRepository.find({
      where: { operatedByMainCompanyId: dto.companyId },
      select: { id: true, operatedByMainCompanyId: true },
    });

    const subordinateCompaniesIds = subordinateCompanies.map((subordinateCompany) => {
      return subordinateCompany.id;
    });

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const acceptedChartLine: EChartLine = EChartLine.ACCEPTED_APPOINTMENTS;
    const rejectedChartLine: EChartLine = EChartLine.REJECTED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    const result: IChartLineDataOutput = {
      [acceptedChartLine]: { values: [], labels: [] },
      [rejectedChartLine]: { values: [], labels: [] },
    };

    for (const [index, period] of dates.entries()) {
      const [acceptedCount, rejectedCount] = await Promise.all([
        this.appointmentRepository.count({
          where: {
            schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
            languageFrom: dto.languageFrom,
            languageTo: dto.languageTo,
            acceptedDate: Between(period.startPeriod, period.endPeriod),
            interpreter: {
              id: dto.userRoleId,
              operatedByCompanyId: In(subordinateCompaniesIds),
            },
          },
        }),
        this.appointmentRepository.count({
          where: {
            schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
            languageFrom: dto.languageFrom,
            languageTo: dto.languageTo,
            updatingDate: Between(period.startPeriod, period.endPeriod),
            appointmentAdminInfo: {
              cancellations: {
                roleName: In(INTERPRETER_ROLES),
              },
            },
            interpreter: {
              id: dto.userRoleId,
              operatedByCompanyId: In(subordinateCompaniesIds),
            },
          },
        }),
      ]);

      const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

      result[acceptedChartLine]?.values.push(acceptedCount);
      result[acceptedChartLine]?.labels.push(formatDay);
      result[rejectedChartLine]?.values.push(rejectedCount);
      result[rejectedChartLine]?.labels.push(formatDay);
    }

    return result;
  }
}
