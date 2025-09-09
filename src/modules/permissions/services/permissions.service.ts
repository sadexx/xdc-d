import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Method } from "src/modules/permissions/entities";
import { app } from "src/main";
import { Router } from "express";
import { ILayer } from "express-serve-static-core";
import { API_PREFIX } from "src/common/constants";
import { languageDocCheck } from "src/modules/language-doc-check/common/permissions-seeds";
import { Role } from "src/modules/users/entities";
import { EUserRoleName } from "src/modules/users/common/enums";
import { ielts } from "src/modules/ielts/common/permissions-seeds";
import { rightToWorkCheck } from "src/modules/right-to-work-check/common/permissions-seeds";
import { abn } from "src/modules/abn/common/permissions-seeds";
import { accountActivation } from "src/modules/account-activation/common/permissions-seeds";
import { admin } from "src/modules/admin/common/permissions-seeds";
import { appointmentsOrder } from "src/modules/appointment-orders/appointment-order/common/permissions-seeds";
import { appointments } from "src/modules/appointments/appointment/common/permissions-seeds";
import { auth } from "src/modules/auth/common/permissions-seeds";
import { awsPinpoint } from "src/modules/aws/pinpoint/common/permissions-seeds";
import { webhook } from "src/modules/aws/sqs/common/permissions-seeds";
import { backyCheck } from "src/modules/backy-check/common/permissions-seeds";
import { chimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/common/permissions-seeds/seeds";
import { companies } from "src/modules/companies/common/permissions-seeds";
import { concessionCard } from "src/modules/concession-card/common/permissions-seeds";
import { contactForm } from "src/modules/contact-form/common/permissions-seeds";
import { contentManagement } from "src/modules/content-management/common/permissions-seeds";
import { docusign } from "src/modules/docusign/common/permissions-seeds";
import { fileManagement } from "src/modules/file-management/common/permissions-seeds";
import { health } from "src/modules/health/common/permissions-seeds";
import { interpreterProfile } from "src/modules/interpreters/profile/common/permissions-seeds";
import { naati } from "src/modules/naati/common/permissions-seeds";
import { permissions } from "src/modules/permissions/common/permissions-seeds";
import { reviews } from "src/modules/reviews/common/permissions-seeds";
import { sumsub } from "src/modules/sumsub/common/permissions-seeds";
import { uiLanguages } from "src/modules/ui-languages/common/permissions-seeds";
import { users } from "src/modules/users/common/permissions-seeds";
import { prometheus } from "src/modules/prometheus/common/permissions-seeds";
import { ENDPOINTS_WITHOUT_SEEDS } from "src/modules/permissions/common/constants/constants";
import { EditOnePermissionDto, EditPermissionsByModuleDto } from "src/modules/permissions/common/dto";
import { IGetPermissionsModules } from "src/modules/permissions/common/interfaces";
import { multiWayParticipants } from "src/modules/multi-way-participant/common/permissions-seeds/seeds";
import { addresses } from "src/modules/addresses/common/permissions-seeds";
import { interpreterQuestionnaire } from "src/modules/interpreters/questionnaire/common/permissions-seeds";
import { notifications } from "src/modules/notifications/common/permissions-seeds";
import { chimeMessagingConfiguration } from "src/modules/chime-messaging-configuration/common/permissions-seeds";
import { statistics } from "src/modules/statistics/common/permissions-seeds";
import { ESortOrder } from "src/common/enums";
import { userAvatars } from "src/modules/user-avatars/common/permissions-seeds";
import { toolbox } from "src/modules/toolbox/common/permissions-seeds";
import { promoCampaigns } from "src/modules/promo-campaigns/common/permissions-seeds";
import { draftAppointments } from "src/modules/draft-appointments/common/permissions-seeds";
import { oldPayments } from "src/modules/payments/common/permissions-seeds";
import { rates } from "src/modules/rates/common/permissions-seeds";
import { interpreterBadge } from "src/modules/interpreters/badge/common/permissions-seeds";
import { memberships } from "src/modules/memberships/common/permissions-seeds";
import { blacklists } from "src/modules/blacklists/common/permissions-seeds";
import { LokiLogger } from "src/common/logger";
import { archiveAudioRecords } from "src/modules/archive-audio-records/common/permissions-seeds";
import { paymentInformation } from "src/modules/payment-information/common/permissions-seeds";
import { csv } from "src/modules/csv/common/permissions-seeds";
import { RedisService } from "src/modules/redis/services";
import { companiesDepositCharge } from "src/modules/companies-deposit-charge/common/permissions-seeds";
import { IGetPermissionsOutput } from "src/modules/permissions/common/outputs";
import { taskExecution } from "src/modules/task-execution/common/permissions-seeds/seeds";
import { urlShortener } from "src/modules/url-shortener/common/permissions-seeds";
import { removal } from "src/modules/removal/common/permissions-seeds";
import { settings } from "src/modules/settings/common/permissions-seeds";

const seeds = {
  ...abn,
  ...accountActivation,
  ...admin,
  ...appointmentsOrder,
  ...appointments,
  ...auth,
  ...awsPinpoint,
  ...webhook,
  ...backyCheck,
  ...chimeMeetingConfiguration,
  ...chimeMessagingConfiguration,
  ...companies,
  ...concessionCard,
  ...contactForm,
  ...contentManagement,
  ...docusign,
  ...fileManagement,
  ...interpreterQuestionnaire,
  ...health,
  ...ielts,
  ...interpreterProfile,
  ...naati,
  ...permissions,
  ...prometheus,
  ...languageDocCheck,
  ...reviews,
  ...rightToWorkCheck,
  ...sumsub,
  ...uiLanguages,
  ...users,
  ...multiWayParticipants,
  ...addresses,
  ...notifications,
  ...statistics,
  ...userAvatars,
  ...toolbox,
  ...promoCampaigns,
  ...draftAppointments,
  ...oldPayments,
  ...rates,
  ...interpreterBadge,
  ...memberships,
  ...blacklists,
  ...archiveAudioRecords,
  ...paymentInformation,
  ...csv,
  ...companiesDepositCharge,
  ...taskExecution,
  ...urlShortener,
  ...removal,
  ...settings,
};

@Injectable()
export class PermissionsService {
  private readonly lokiLogger = new LokiLogger(PermissionsService.name);

  public constructor(
    @InjectRepository(Method)
    private readonly methodRepository: Repository<Method>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly redisService: RedisService,
  ) {}

  public async getPermissions(userRoleName: EUserRoleName): Promise<IGetPermissionsOutput> {
    let permissions = await this.redisService.getJson<IGetPermissionsOutput>(userRoleName);

    if (!permissions) {
      permissions = await this.getPermissionsByRole(userRoleName);

      await this.redisService.setJson(userRoleName, permissions, 0);
    }

    return permissions;
  }

  public async editOnePermission(dto: EditOnePermissionDto): Promise<void> {
    const method = await this.methodRepository.findOne({
      where: { id: dto.id },
      relations: { role: true },
    });

    if (!method) {
      throw new NotFoundException("Method with this id not found!");
    }

    if (!method.isEditable) {
      throw new BadRequestException("Method is not editable!");
    }

    await this.methodRepository.update({ id: dto.id }, { isAllowed: dto.isAllowed, isEdited: true });

    await this.setPermissionsToCacheByRole(method.role.name);

    return;
  }

  public async editPermissionsByModule(dto: EditPermissionsByModuleDto): Promise<void> {
    const methods = await this.methodRepository.find({
      where: { module: dto.module, role: { name: dto.userRole } },
    });

    if (methods.length === 0) {
      throw new BadRequestException("Incorrect method name!");
    }

    methods.forEach((method) => {
      if (method.isEditable) {
        method.isAllowed = dto.isAllowed;
        method.isEdited = true;
      }
    });

    await this.methodRepository.save(methods);

    await this.setPermissionsToCacheByRole(dto.userRole);

    return;
  }

  public async seedPermissions(): Promise<boolean> {
    const CONTROLLERS_INDEX_IN_PATH = 2;

    const roles = await this.roleRepository.find({ relations: { methods: true } });
    const newMethods: Method[] = [];
    const newMethodsNames: string[] = [];

    const router: Router = app.getHttpAdapter().getInstance()._router as Router;

    router.stack.forEach((layer: ILayer) => {
      if (layer.route) {
        const path = layer.route?.path;
        const method = layer.route?.stack[0].method;

        if (path && method) {
          const endpointName = `${method.toUpperCase()} ${path}`;

          if (ENDPOINTS_WITHOUT_SEEDS.includes(endpointName)) {
            return;
          }

          if (newMethodsNames.includes(endpointName)) {
            return;
          }

          const pathParts = path.split("/");

          if (pathParts.length < 1 || pathParts[1] !== API_PREFIX) {
            return;
          }

          let endpointSeed = seeds[endpointName as never];

          if (!endpointSeed) {
            this.lokiLogger.warn(`Endpoint "${endpointName}" not have default seed! Add, please.`);

            endpointSeed = {
              description: path.split("-").join(" "),
              roles: {
                "super-admin": {
                  isAllowed: true,
                },
              },
              isNotEditableForOtherRoles: false,
            };
          }

          for (const role of roles) {
            const roleConfig = endpointSeed.roles[role.name];
            let methodIsAllowedForRole: boolean;
            let methodIsEditableForRole: boolean;

            if (roleConfig) {
              methodIsAllowedForRole = roleConfig.isAllowed;
              methodIsEditableForRole = roleConfig.isEditable ?? true;
            } else {
              methodIsAllowedForRole = false;
              methodIsEditableForRole = !endpointSeed.isNotEditableForOtherRoles;
            }

            const existedMethod = role.methods.find(
              (roleMethod) => roleMethod.path === path && roleMethod.methodType === method.toUpperCase(),
            );

            if (existedMethod) {
              if (
                (existedMethod.isAllowed !== methodIsAllowedForRole ||
                  existedMethod.isEditable !== methodIsEditableForRole ||
                  existedMethod.description !== endpointSeed.description) &&
                !existedMethod.isEdited
              ) {
                existedMethod.isAllowed = methodIsAllowedForRole;
                existedMethod.isEditable = methodIsEditableForRole;
                existedMethod.description = endpointSeed.description;

                newMethods.push(existedMethod);
                newMethodsNames.push(`${method.toUpperCase()} ${path}`);
              }

              continue;
            }

            const newMethod = this.methodRepository.create({
              methodType: method.toUpperCase(),
              module: pathParts[CONTROLLERS_INDEX_IN_PATH].toUpperCase(),
              path,
              description: endpointSeed.description,
              isAllowed: methodIsAllowedForRole,
              isEditable: methodIsEditableForRole,
              role,
            });

            newMethods.push(newMethod);
            newMethodsNames.push(`${method.toUpperCase()} ${path}`);
          }
        }

        return;
      } else {
        return;
      }
    });

    await this.methodRepository.save(newMethods);

    if (newMethodsNames.length > 0) {
      const newMethodsNamesSet = new Set(newMethodsNames);
      const newMethodsArray = Array.from(newMethodsNamesSet);
      this.lokiLogger.debug(`Successfully (re)seeded methods: ${JSON.stringify(newMethodsArray.join(", "))}`);
    }

    void this.setPermissionsToCache();

    return true;
  }

  private async setPermissionsToCache(): Promise<void> {
    const roles = await this.roleRepository.find();

    for (const role of roles) {
      await this.setPermissionsToCacheByRole(role.name);
    }

    return;
  }

  private async setPermissionsToCacheByRole(userRoleName: EUserRoleName): Promise<void> {
    const permissionsData = await this.getPermissionsByRole(userRoleName);

    await this.redisService.setJson(userRoleName, permissionsData, 0);

    return;
  }

  public async getPermissionsByRole(userRoleName: EUserRoleName): Promise<IGetPermissionsOutput> {
    const methods = await this.methodRepository.find({
      where: { role: { name: userRoleName } },
      order: { module: ESortOrder.ASC, description: ESortOrder.ASC },
    });

    const modules: IGetPermissionsModules = {};

    methods.forEach((method) => {
      if (!modules[method.module]) {
        modules[method.module] = {
          isAllAllowed: true,
          isAllNotEditable: true,
        };
      }

      if (!method.isAllowed) {
        modules[method.module].isAllAllowed = false;
      }

      if (method.isEditable) {
        modules[method.module].isAllNotEditable = false;
      }
    });

    return {
      methods,
      modules,
    };
  }
}
