import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UpdateAppointmentAddressDto } from "src/modules/addresses/common/dto";
import { Address } from "src/modules/addresses/entities";
import { Repository } from "typeorm";
import { AppointmentUpdateService } from "src/modules/appointments/appointment/services";
import { COMPLETED_APPOINTMENT_STATUSES } from "src/modules/appointments/shared/common/constants";
import { findOneOrFail } from "src/common/utils";
import { EAppointmentRecreationType } from "src/modules/appointments/appointment/common/enums";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { AppointmentNotificationService } from "src/modules/appointments/shared/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { AccessControlService } from "src/modules/access-control/services";

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly appointmentUpdateService: AppointmentUpdateService,
    private readonly appointmentNotificationService: AppointmentNotificationService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async updateAppointmentAddressById(
    id: string,
    user: ITokenUserData,
    dto: UpdateAppointmentAddressDto,
  ): Promise<void> {
    const address = await findOneOrFail(id, this.addressRepository, {
      select: {
        id: true,
        latitude: true,
        longitude: true,
        country: true,
        state: true,
        suburb: true,
        streetName: true,
        streetNumber: true,
        postcode: true,
        building: true,
        unit: true,
        timezone: true,
        appointment: {
          id: true,
          platformId: true,
          clientId: true,
          status: true,
          appointmentsGroupId: true,
          isGroupAppointment: true,
          sameInterpreter: true,
          interpreter: {
            id: true,
            user: {
              id: true,
              email: true,
            },
            profile: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      where: { id },
      relations: { appointment: { interpreter: { user: true, profile: true } } },
    });

    if (!address.appointment) {
      throw new BadRequestException("Address is not associated with an appointment.");
    }

    if (address.appointment && COMPLETED_APPOINTMENT_STATUSES.includes(address.appointment.status)) {
      throw new BadRequestException("Address cannot be updated in current state of appointment.");
    }

    await this.accessControlService.authorizeUserRoleForAppointmentOperation(user, address.appointment);

    const recreationType = this.getRecreationType(address, dto);
    const updatedAddress = this.addressRepository.merge(address, dto);

    if (recreationType) {
      await this.appointmentUpdateService.handleAppointmentAddressUpdate(
        address.appointment.id,
        updatedAddress,
        recreationType,
      );
    } else {
      await this.addressRepository.update(address.id, updatedAddress);
    }

    if (address.appointment.interpreter) {
      await this.appointmentNotificationService.sendUpdatedAppointmentNotificationToInterpreter(
        address.appointment.interpreter,
        address.appointment,
        recreationType,
      );
    }
  }

  private getRecreationType(address: Address, dto: UpdateAppointmentAddressDto): EAppointmentRecreationType | null {
    const { appointment } = address;

    if (!this.orderNeedsRecreation(address, dto) || !appointment) {
      return null;
    }

    if (!appointment.isGroupAppointment) {
      return EAppointmentRecreationType.SINGLE;
    }

    if (appointment.sameInterpreter) {
      return EAppointmentRecreationType.GROUP;
    } else {
      return EAppointmentRecreationType.SINGLE_IN_GROUP;
    }
  }

  private orderNeedsRecreation(address: Address, dto: UpdateAppointmentAddressDto): boolean {
    switch (true) {
      case dto.latitude && dto.latitude !== address.latitude:
        return true;

      case dto.longitude && dto.longitude !== address.longitude:
        return true;

      case dto.country && dto.country !== (address.country as EExtCountry):
        return true;

      case dto.state && dto.state !== address.state:
        return true;

      case dto.suburb && dto.suburb !== address.suburb:
        return true;

      case dto.streetName && dto.streetName !== address.streetName:
        return true;

      case dto.streetNumber && dto.streetNumber !== address.streetNumber:
        return true;

      case dto.postcode && dto.postcode !== address.postcode:
        return true;

      default:
        return false;
    }
  }
}
