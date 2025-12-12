import { Injectable } from "@nestjs/common";
import { DataSource, EntityManager, In } from "typeorm";
import { LokiLogger } from "src/common/logger";
import { EAccountStatus, EUserGender, EUserRoleName } from "src/modules/users/common/enums";
import { EOnboardingStatus } from "src/modules/stripe/common/enums";
import { EPaymentSystem } from "src/modules/payments/common/enums/core";
import { COMPANY_LFH_FULL_NAME, COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { UserRole } from "src/modules/users/entities";
import { AppointmentCreateService, AppointmentSchedulerService } from "src/modules/appointments/appointment/services";
import { addDays, addMinutes } from "date-fns";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentParticipantType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { EInterpreterCertificateType, ELanguages } from "src/modules/interpreters/profile/common/enum";
import { delay } from "src/common/utils";
import { AppointmentOrderCommandService } from "src/modules/appointment-orders/appointment-order/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  NUMBER_OF_MILLISECONDS_IN_SECOND,
  NUMBER_OF_MINUTES_IN_FIVE_MINUTES,
  NUMBER_OF_MINUTES_IN_HOUR,
  NUMBER_OF_MINUTES_IN_THREE_MINUTES,
  NUMBER_OF_SECONDS_IN_MINUTE,
} from "src/common/constants";
import { AppointmentOrder } from "src/modules/appointment-orders/appointment-order/entities";
import { ESortOrder } from "src/common/enums";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { MeetingClosingService, MeetingJoinService } from "src/modules/chime-meeting-configuration/services";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";

@Injectable()
export class ScriptikService {
  private readonly lokiLogger = new LokiLogger(ScriptikService.name);
  private readonly BATCH_SIZE: number = 100;
  private readonly CONTACT_EMAIL: string = "oleksiy.f@redcat.dev";
  private readonly DELAY_MS: number =
    NUMBER_OF_MINUTES_IN_THREE_MINUTES * NUMBER_OF_SECONDS_IN_MINUTE * NUMBER_OF_MILLISECONDS_IN_SECOND;

  constructor(
    private readonly appointmentCreateService: AppointmentCreateService,
    private readonly appointmentOrderCommandService: AppointmentOrderCommandService,
    private readonly appointmentSchedulerService: AppointmentSchedulerService,
    private readonly meetingJoinService: MeetingJoinService,
    private readonly meetingClosingService: MeetingClosingService,
    private readonly dataSource: DataSource,
  ) {}

  public async runScriptik(): Promise<void> {
    this.lokiLogger.debug(`Cleaning appointments and scriptik users...`);
    await this.cleanScriptik();

    this.lokiLogger.debug(`Creating ${this.BATCH_SIZE} clients and interpreters...`);
    const { clients, interpreters } = await this.createClientsAndInterpreters();

    this.lokiLogger.debug(`Creating ${this.BATCH_SIZE} appointments for clients...`);
    await this.createAppointmentsForClients(clients);

    this.lokiLogger.debug(`${this.DELAY_MS} ms delay to process appointments...`);
    await delay(this.DELAY_MS);

    this.lokiLogger.debug("Accepting appointments by interpreters...");
    await this.acceptAppointmentsByInterpreters(clients, interpreters);

    this.lokiLogger.debug("Updating appointments start time...");
    await this.updateAppointmentStartTimes();

    this.lokiLogger.debug("Activating upcoming appointments...");
    await this.appointmentSchedulerService.activateUpcomingAppointments();

    this.lokiLogger.debug("Joining meetings...");
    await this.joinMeetings(clients, interpreters);

    this.lokiLogger.debug(`${this.DELAY_MS} ms delay before closing meetings...`);
    await delay(this.DELAY_MS);

    this.lokiLogger.debug("Closing meetings...");
    await this.closeMeetings(clients, interpreters);
  }

  private async cleanScriptik(): Promise<void> {
    await this.dataSource.query(`DELETE FROM appointments`);
    await this.dataSource.query(
      `
      DELETE FROM users
      WHERE email LIKE 'client%@gmail.com'
      OR email LIKE 'interpreter%@gmail.com'
      `,
    );
  }

  private async createClientsAndInterpreters(): Promise<{ clients: UserRole[]; interpreters: UserRole[] }> {
    return await this.dataSource.transaction(async (manager) => {
      const clients = await this.createUsersBatch(manager, this.BATCH_SIZE, "client", EUserRoleName.IND_CLIENT);
      const interpreters = await this.createUsersBatch(
        manager,
        this.BATCH_SIZE,
        "interpreter",
        EUserRoleName.IND_PROFESSIONAL_INTERPRETER,
      );

      return { clients, interpreters };
    });
  }

  private async createUsersBatch(
    manager: EntityManager,
    numberOfUsers: number,
    emailPrefix: string,
    roleName: EUserRoleName,
  ): Promise<UserRole[]> {
    const result = await manager.query<{ id: string }[]>(
      `
      WITH nums AS (SELECT generate_series(1, $1) AS n),
           new_users AS (
             INSERT INTO users (email, phone_number, platform_id)
             SELECT $2 || n || '@gmail.com', substr(md5(random()::text || n::text), 1, 12), substr(md5(random()::text || n::text), 1, 12)
						 FROM nums
             RETURNING id
           ),
           inserted_roles AS (
             INSERT INTO user_roles (
               user_id, role_id, account_status, is_active,
               is_registration_finished, is_required_info_fulfilled,
               is_user_agreed_to_terms_and_conditions,
               timezone, operated_by_company_id, operated_by_company_name
             )
             SELECT 
               nu.id,
               (SELECT id FROM roles WHERE role = $3),
               $4, true, true, true, true,
               'Europe/Kiev', $5, $6
             FROM new_users nu
             RETURNING id
           )
      SELECT id FROM inserted_roles
      `,
      [numberOfUsers, emailPrefix, roleName, EAccountStatus.ACTIVE, COMPANY_LFH_ID, COMPANY_LFH_FULL_NAME],
    );
    const userRoleIds = result.map((r) => r.id);

    await manager.query(
      `INSERT INTO user_profiles (first_name, last_name, date_of_birth, user_gender, contact_email, user_role_id)
       SELECT $1, 'Test' || row_number() OVER (), '2003-12-08', $2, $3, id
       FROM unnest($4::uuid[]) AS t(id)`,
      [emailPrefix, EUserGender.MALE, this.CONTACT_EMAIL, userRoleIds],
    );

    await manager.query(
      `INSERT INTO payments_information (
         stripe_client_account_id, stripe_client_payment_method_id, stripe_client_last_four,
         stripe_interpreter_account_id, stripe_interpreter_onboarding_status,
         stripe_interpreter_bank_id, stripe_interpreter_bank_account_last4, stripe_interpreter_bank_name,
         interpreter_system_for_payout, users_roles_id
       )
       SELECT 'cus_SDnNHcGsTlWJjm', 'pm_1RJLn1GbKadJtsaS8DBIBih9', '0077',
              'acct_1RHNFD2cNTabCgKc', $1, 'ba_1RHNLu2cNTabCgKcscEYalcm', '3456',
              'STRIPE TEST BANK', $2, id
       FROM unnest($3::uuid[]) AS t(id)`,
      [EOnboardingStatus.ONBOARDING_SUCCESS, EPaymentSystem.STRIPE, userRoleIds],
    );

    await manager.query(
      `INSERT INTO addresses (
       latitude, longitude, organization_name, country, state, suburb,
       street_name, street_number, postcode, building, unit, timezone, user_role_id
     )
     SELECT 
       49.233083, 28.468217, 'Test Organization', 'Ukraine', 'Vinnytsia Oblast', 'Vinnytsia',
       'Test Street', '1', '21000', 'Building A', 'Unit 1', 'Europe/Kiev', id
     FROM unnest($1::uuid[]) AS t(id)`,
      [userRoleIds],
    );

    if (roleName === EUserRoleName.IND_PROFESSIONAL_INTERPRETER) {
      await manager.query(
        `INSERT INTO interpreter_profiles (user_role_id, certificate_type, known_languages)
         SELECT id, $1, ARRAY[]::interpreter_profiles_known_languages_enum[]
         FROM unnest($2::uuid[]) AS t(id)`,
        [EInterpreterCertificateType.OTHER, userRoleIds],
      );
    }

    return manager.find(UserRole, {
      where: { id: In(userRoleIds) },
      relations: { user: true, role: true, profile: true, interpreterProfile: true },
    });
  }

  private async createAppointmentsForClients(clients: UserRole[]): Promise<void> {
    for (const client of clients) {
      await this.appointmentCreateService.createVirtualAppointment(client, {
        scheduledStartTime: addDays(new Date(), 1),
        schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
        schedulingDurationMin: 60,
        topic: EAppointmentTopic.GENERAL,
        preferredInterpreterGender: EUserGender.MALE,
        interpreterType: EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER,
        languageFrom: ELanguages.ACEH,
        languageTo: ELanguages.ACHOLI,
        participantType: EAppointmentParticipantType.TWO_WAY,
        schedulingExtraDay: false,
        sameInterpreter: true,
        acceptOvertimeRates: true,
        communicationType: EAppointmentCommunicationType.VIDEO,
        interpretingType: EAppointmentInterpretingType.CONSECUTIVE,
        alternativePlatform: false,
      });
    }
  }

  private async acceptAppointmentsByInterpreters(clients: UserRole[], interpreters: UserRole[]): Promise<void> {
    const INTERPRETER_BATCH_SIZE: number = 5;
    for (let i = 0; i < clients.length; i++) {
      const appointmentOrder = await this.dataSource
        .getRepository(AppointmentOrder)
        .createQueryBuilder("appointmentOrder")
        .innerJoin("appointmentOrder.appointment", "appointment")
        .where("appointment.client_id = :clientId", { clientId: clients[i].id })
        .orderBy("appointment.creationDate", ESortOrder.DESC)
        .getOne();

      if (!appointmentOrder) {
        this.lokiLogger.warn(`No appointment order found for client ${clients[i].id}`);
        continue;
      }

      await this.appointmentOrderCommandService.acceptAppointmentOrder(appointmentOrder.id, {
        userRoleId: interpreters[i].id,
      } as ITokenUserData);

      if ((i + 1) % INTERPRETER_BATCH_SIZE === 0) {
        await delay(NUMBER_OF_MILLISECONDS_IN_SECOND);
      }
    }
  }

  private async updateAppointmentStartTimes(): Promise<void> {
    const scheduledStartTime = addMinutes(new Date(), NUMBER_OF_MINUTES_IN_FIVE_MINUTES);
    const scheduledEndTime = addMinutes(new Date(), NUMBER_OF_MINUTES_IN_HOUR);

    await this.dataSource
      .createQueryBuilder()
      .update(Appointment)
      .set({ scheduledStartTime, scheduledEndTime, internalEstimatedEndTime: scheduledEndTime })
      .execute();
    await this.dataSource
      .createQueryBuilder()
      .update(ChimeMeetingConfiguration)
      .set({ meetingScheduledStartTime: scheduledStartTime })
      .execute();
  }

  private async joinMeetings(clients: UserRole[], interpreters: UserRole[]): Promise<void> {
    for (let i = 0; i < clients.length; i++) {
      const appointment = await this.dataSource
        .getRepository(Appointment)
        .createQueryBuilder("appointment")
        .where("appointment.client_id = :clientId AND appointment.interpreter_id = :interpreterId", {
          clientId: clients[i].id,
          interpreterId: interpreters[i].id,
        })
        .orderBy("appointment.creationDate", ESortOrder.DESC)
        .getOne();

      if (!appointment) {
        this.lokiLogger.warn(`No appointment found for client ${clients[i].id}`);
        continue;
      }

      await this.meetingJoinService.joinMeetingAsInternalUser(appointment.id, {
        userRoleId: clients[i].id,
        role: EUserRoleName.IND_CLIENT,
      } as ITokenUserData);
      await this.meetingJoinService.joinMeetingAsInternalUser(appointment.id, {
        userRoleId: interpreters[i].id,
        role: EUserRoleName.IND_PROFESSIONAL_INTERPRETER,
      } as ITokenUserData);
    }
  }

  private async closeMeetings(clients: UserRole[], interpreters: UserRole[]): Promise<void> {
    for (let i = 0; i < clients.length; i++) {
      const appointment = await this.dataSource
        .getRepository(Appointment)
        .createQueryBuilder("appointment")
        .leftJoinAndSelect("appointment.chimeMeetingConfiguration", "chimeMeetingConfiguration")
        .where("appointment.client_id = :clientId AND appointment.interpreter_id = :interpreterId", {
          clientId: clients[i].id,
          interpreterId: interpreters[i].id,
        })
        .orderBy("appointment.creationDate", ESortOrder.DESC)
        .getOne();

      if (!appointment || !appointment.chimeMeetingConfiguration?.chimeMeetingId) {
        this.lokiLogger.warn(`No appointment found for client ${clients[i].id}`);
        continue;
      }

      await this.meetingClosingService.closeMeeting(appointment.chimeMeetingConfiguration.chimeMeetingId);
    }
  }
}
