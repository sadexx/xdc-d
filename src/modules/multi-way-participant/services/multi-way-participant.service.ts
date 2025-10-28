import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import {
  CreateMultiWayParticipantDto,
  UpdateMultiWayParticipantDto,
} from "src/modules/multi-way-participant/common/dto";
import { Attendee, ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { EAppointmentParticipantType } from "src/modules/appointments/appointment/common/enums";
import { AttendeeManagementService } from "src/modules/chime-meeting-configuration/services";
import { IMessageOutput } from "src/common/outputs";
import { EUserRoleName } from "src/modules/users/common/enums";
import { ICreateMultiWayParticipant } from "src/modules/multi-way-participant/common/interfaces";
import { findOneOrFail, findOneOrFailTyped } from "src/common/utils";
import { TUpdateAppointment } from "src/modules/appointments/appointment/common/types";
import { AppointmentSharedService } from "src/modules/appointments/shared/services";
import {
  AddParticipantToAppointmentQuery,
  DeleteParticipantQuery,
  TAddParticipantToAppointment,
  TDeleteParticipant,
  TUpdateParticipant,
  UpdateParticipantQuery,
} from "src/modules/multi-way-participant/common/types";
import { EMultiWayParticipantErrorCodes } from "src/modules/multi-way-participant/common/enums";

@Injectable()
export class MultiWayParticipantService {
  private readonly DEFAULT_PARTICIPANTS: number = 10;

  constructor(
    @InjectRepository(MultiWayParticipant)
    private readonly multiWayParticipantRepository: Repository<MultiWayParticipant>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Attendee)
    private readonly attendeeRepository: Repository<Attendee>,
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
    private readonly attendeeManagementService: AttendeeManagementService,
    private readonly appointmentSharedService: AppointmentSharedService,
  ) {}

  public async addParticipantToAppointment(
    appointmentId: string,
    participant: CreateMultiWayParticipantDto,
  ): Promise<IMessageOutput> {
    const appointment = await findOneOrFailTyped<TAddParticipantToAppointment>(
      appointmentId,
      this.appointmentRepository,
      {
        select: AddParticipantToAppointmentQuery.select,
        where: { id: appointmentId },
        relations: AddParticipantToAppointmentQuery.relations,
      },
    );

    if (!appointment.client) {
      throw new BadRequestException(EMultiWayParticipantErrorCodes.PARTICIPANT_CLIENT_REQUIRED_FOR_ADD);
    }

    const newParticipant = this.multiWayParticipantRepository.create({
      appointment: appointment,
      name: participant.name,
      age: participant.age,
      phoneCode: participant.phoneCode,
      phoneNumber: participant.phoneNumber,
      email: participant.email,
    });
    await this.multiWayParticipantRepository.save(newParticipant);

    if (appointment.participantType !== EAppointmentParticipantType.MULTI_WAY) {
      await this.appointmentRepository.update(appointmentId, {
        participantType: EAppointmentParticipantType.MULTI_WAY,
      });
    }

    if (appointment.chimeMeetingConfiguration) {
      const attendee = await this.attendeeManagementService.addNewAttendeeToPreBookedMeeting(
        appointment.chimeMeetingConfiguration,
        newParticipant,
      );

      await this.appointmentSharedService.sendParticipantsInvitations(
        appointment,
        appointment.client,
        [newParticipant],
        [attendee],
      );
    } else if (appointment.alternativePlatform) {
      await this.appointmentSharedService.sendParticipantsInvitations(appointment, appointment.client, [
        newParticipant,
      ]);
    }

    return { message: "Participant added successfully." };
  }

  public async updateParticipant(id: string, dto: UpdateMultiWayParticipantDto): Promise<IMessageOutput> {
    let participant = await findOneOrFailTyped<TUpdateParticipant>(id, this.multiWayParticipantRepository, {
      select: UpdateParticipantQuery.select,
      where: { id },
      relations: UpdateParticipantQuery.relations,
    });
    const { appointment } = participant;

    if (!appointment.client) {
      throw new BadRequestException(EMultiWayParticipantErrorCodes.PARTICIPANT_CLIENT_REQUIRED_FOR_UPDATE);
    }

    await this.multiWayParticipantRepository.update(id, dto);
    participant = { ...participant, ...dto };

    if (dto.email || (dto.phoneCode && dto.phoneNumber)) {
      if (appointment.alternativePlatform) {
        await this.appointmentSharedService.sendParticipantsInvitations(appointment, appointment.client, [participant]);
      } else {
        let attendee = await findOneOrFail(id, this.attendeeRepository, {
          where: { externalUserId: id },
        });

        let newPhoneNumber: string | null = null;

        if (dto.phoneCode && dto.phoneNumber) {
          newPhoneNumber = `${dto.phoneCode}${dto.phoneNumber}`;
        } else if (participant.phoneCode && participant.phoneNumber) {
          newPhoneNumber = `${participant.phoneCode}${participant.phoneNumber}`;
        }

        const updatedAttendeeData: Partial<Attendee> = {
          guestPhoneNumber: newPhoneNumber,
        };

        await this.attendeeRepository.update(attendee.id, updatedAttendeeData);
        attendee = { ...attendee, ...updatedAttendeeData };

        await this.appointmentSharedService.sendParticipantsInvitations(
          appointment,
          appointment.client,
          [participant],
          [attendee],
        );
      }
    }

    return { message: "Participant updated successfully." };
  }

  public async deleteParticipant(id: string): Promise<void> {
    const participant = await findOneOrFailTyped<TDeleteParticipant>(id, this.multiWayParticipantRepository, {
      select: DeleteParticipantQuery.select,
      where: { id },
      relations: DeleteParticipantQuery.relations,
    });

    await this.multiWayParticipantRepository.remove(participant as MultiWayParticipant);

    const remainingParticipants = (participant.appointment.participants?.length || 0) - 1;

    if (remainingParticipants < 1) {
      await this.appointmentRepository.update(participant.appointment.id, {
        participantType: EAppointmentParticipantType.TWO_WAY,
      });
    }

    if (participant.appointment.chimeMeetingConfiguration) {
      await this.attendeeManagementService.deleteAttendeeByExternalUserId(
        participant.appointment.chimeMeetingConfiguration,
        id,
      );
    }

    return;
  }

  public async createMultiWayParticipants(
    participants: ICreateMultiWayParticipant[],
    appointment: Appointment,
  ): Promise<MultiWayParticipant[]> {
    const newParticipants = participants.map((participant) => {
      const participantDto: ICreateMultiWayParticipant = {
        appointment: appointment,
        name: participant.name,
        age: participant.age,
        phoneCode: participant.phoneCode,
        phoneNumber: participant.phoneNumber,
        email: participant.email,
      };

      return this.multiWayParticipantRepository.create(participantDto);
    });

    return await this.multiWayParticipantRepository.save(newParticipants);
  }

  public async removeAllParticipantsFromAppointment(appointment: TUpdateAppointment): Promise<void> {
    await this.multiWayParticipantRepository.delete({ appointmentId: appointment.id });

    if (appointment.chimeMeetingConfiguration) {
      const participantsCount = await this.multiWayParticipantRepository.count({
        where: { appointmentId: appointment.id },
      });
      const { id, maxAttendees } = appointment.chimeMeetingConfiguration;

      await this.attendeeRepository.delete({
        chimeMeetingConfigurationId: id,
        roleName: EUserRoleName.INVITED_GUEST,
      });

      const updatedMaxAttendees = Math.max(this.DEFAULT_PARTICIPANTS, maxAttendees - participantsCount);
      await this.chimeMeetingConfigurationRepository.update(id, {
        maxAttendees: updatedMaxAttendees,
      });
    }
  }
}
