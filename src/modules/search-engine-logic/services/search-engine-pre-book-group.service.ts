import { Injectable } from "@nestjs/common";
import { SearchEngineStepService } from "src/modules/search-engine-logic/services";
import { COMPANY_LFH_FULL_NAME } from "src/modules/companies/common/constants/constants";
import { IGroupSearchContext } from "src/modules/search-engine-logic/common/interface";
import { EAppointmentCommunicationType } from "src/modules/appointments/appointment/common/enums";
import { ENaatiLevelStepResult } from "src/modules/search-engine-logic/common/enum";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { addMinutes } from "date-fns";
import { NUMBER_OF_MINUTES_IN_HALF_HOUR } from "src/common/constants";

@Injectable()
export class SearchEnginePreBookGroupService {
  constructor(private readonly searchEngineStepService: SearchEngineStepService) {}

  public async startSearchEngineForGroup(context: IGroupSearchContext): Promise<void> {
    if (context.group.operatedByCompanyName === COMPANY_LFH_FULL_NAME) {
      await this.startSearchEngineForLfhCompany(context);
    } else {
      await this.startSearchEngineForOthersCompany(context);
    }
  }

  private async startSearchEngineForLfhCompany(context: IGroupSearchContext): Promise<void> {
    if (!context.isFirstSearchCompleted) {
      await this.startFirstSearchEngineForLfhCompany(context);
    } else {
      await this.startSecondSearchEngineForLfhCompany(context);
    }
  }

  private async startFirstSearchEngineForLfhCompany(context: IGroupSearchContext): Promise<void> {
    context.isFirstSearchCompleted = true;
    context.isSecondSearchCompleted = false;
    context.isSearchNeeded = true;
    context.timeToRestart = addMinutes(new Date(), NUMBER_OF_MINUTES_IN_HALF_HOUR);

    if (!(await this.searchEngineStepService.applyStepWorkingHoursForSpecifiedCompany(context))) {
      return;
    }

    if (!(await this.searchEngineStepService.applyStepService(context))) {
      return;
    }

    if (context.order.communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
      if (!(await this.searchEngineStepService.applyStepFaceToFacePreBooked(context))) {
        return;
      }
    }

    if (!(await this.searchEngineStepService.applyStepConsecutiveTopic(context))) {
      return;
    }

    if (!(await this.searchEngineStepService.applyStepGender(context))) {
      return;
    }

    if (context.order.languageFrom !== ELanguages.ENGLISH && context.order.languageTo !== ELanguages.ENGLISH) {
      if (!context.group.sameInterpreter) {
        if (!(await this.searchEngineStepService.applyStepFreeSlots(context))) {
          return;
        }
      }

      if (!(await this.searchEngineStepService.applyStepBlacklist(context))) {
        return;
      }

      if (!context.group.acceptOvertimeRates) {
        if (!(await this.searchEngineStepService.applyStepTimeZoneRate(context))) {
          return;
        }
      }

      context.isOrderSaved = await this.searchEngineStepService.finalStep(context);

      return;
    }

    let naatiResult: ENaatiLevelStepResult;

    if (!context.group.sameInterpreter) {
      naatiResult = await this.searchEngineStepService.applyNaatiLevelStepsWithFreeSlot(context);
    } else {
      naatiResult = await this.searchEngineStepService.applyNaatiLevelStepsIgnoreFreeSlot(context);
    }

    if (
      naatiResult === ENaatiLevelStepResult.FOURTH_AND_THIRD ||
      naatiResult === ENaatiLevelStepResult.SECOND_AND_FIRST
    ) {
      if (!(await this.searchEngineStepService.applyStepBlacklist(context))) {
        return;
      }

      if (!context.group.acceptOvertimeRates) {
        if (!(await this.searchEngineStepService.applyStepTimeZoneRate(context))) {
          return;
        }
      }

      context.isOrderSaved = await this.searchEngineStepService.finalStep(context);
    } else {
      return;
    }
  }

  private async startSecondSearchEngineForLfhCompany(context: IGroupSearchContext): Promise<void> {
    context.sendNotifications = false;
    context.setRedFlags = false;
    context.isFirstSearchCompleted = true;
    context.isSecondSearchCompleted = true;
    context.isSearchNeeded = false;

    if (!(await this.searchEngineStepService.applyStepWorkingHours(context))) {
      return;
    }

    if (!(await this.searchEngineStepService.applyStepService(context))) {
      return;
    }

    if (context.order.communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
      if (!(await this.searchEngineStepService.applyStepFaceToFacePreBooked(context))) {
        return;
      }
    }

    if (!(await this.searchEngineStepService.applyStepConsecutiveTopic(context))) {
      return;
    }

    if (!(await this.searchEngineStepService.applyStepGender(context))) {
      return;
    }

    context.setRedFlags = true;

    if (!context.group.sameInterpreter) {
      if (!(await this.searchEngineStepService.applyStepWithoutNaatiFirstLevelOrFreeSlot(context))) {
        return;
      }
    } else {
      if (!(await this.searchEngineStepService.applyStepWithoutNaatiFirstLevelIgnoreFreeSlot(context))) {
        return;
      }
    }

    if (!(await this.searchEngineStepService.applyStepBlacklist(context))) {
      return;
    }

    if (!context.group.acceptOvertimeRates) {
      if (!(await this.searchEngineStepService.applyStepTimeZoneRate(context))) {
        return;
      }
    }

    context.isOrderSaved = await this.searchEngineStepService.finalStep(context);
  }

  private async startSearchEngineForOthersCompany(context: IGroupSearchContext): Promise<void> {
    if (!context.isFirstSearchCompleted) {
      await this.startFirstSearchEngineForSpecifiedCompany(context);
    } else {
      await this.startFallbackOrSecondSearchForSpecifiedCompany(context);
    }
  }

  private async startFirstSearchEngineForSpecifiedCompany(context: IGroupSearchContext): Promise<void> {
    if (!(await this.startPreSearchForSpecifiedCompany(context))) {
      return;
    }

    if (context.isCompanyHasInterpreters) {
      await this.startFirstSearchForSpecifiedCompany(context);
    } else {
      await this.startFallbackOrSecondSearchForSpecifiedCompany(context);
    }
  }

  private async startPreSearchForSpecifiedCompany(context: IGroupSearchContext): Promise<boolean> {
    context.isFirstSearchCompleted = true;
    context.isSecondSearchCompleted = false;
    context.isSearchNeeded = true;

    if (!(await this.searchEngineStepService.applyStepWorkingHours(context))) {
      return false;
    }

    if (!(await this.searchEngineStepService.applyStepService(context))) {
      return false;
    }

    if (context.order.communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
      if (!(await this.searchEngineStepService.applyStepFaceToFacePreBooked(context))) {
        return false;
      }
    }

    if (!(await this.searchEngineStepService.applyStepConsecutiveTopic(context))) {
      return false;
    }

    if (!(await this.searchEngineStepService.applyStepGender(context))) {
      return false;
    }

    return true;
  }

  private async startFirstSearchForSpecifiedCompany(context: IGroupSearchContext): Promise<void> {
    context.query = this.searchEngineStepService.initializeQuery();
    context.sendNotifications = false;
    context.setRedFlags = false;
    context.isFirstSearchCompleted = true;
    context.isSecondSearchCompleted = false;
    context.isSearchNeeded = true;
    context.timeToRestart = addMinutes(new Date(), NUMBER_OF_MINUTES_IN_HALF_HOUR);

    if (!(await this.searchEngineStepService.applyStepWorkingHoursForSpecifiedCompany(context))) {
      return;
    }

    if (!(await this.searchEngineStepService.applyStepService(context))) {
      return;
    }

    if (context.order.communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
      if (!(await this.searchEngineStepService.applyStepFaceToFacePreBooked(context))) {
        return;
      }
    }

    if (!(await this.searchEngineStepService.applyStepGender(context))) {
      return;
    }

    if (!context.group.sameInterpreter) {
      if (!(await this.searchEngineStepService.applyStepFreeSlots(context))) {
        return;
      }
    }

    if (!(await this.searchEngineStepService.applyStepBlacklist(context))) {
      return;
    }

    if (!context.group.acceptOvertimeRates) {
      if (!(await this.searchEngineStepService.applyStepTimeZoneRate(context))) {
        return;
      }
    }

    context.isOrderSaved = await this.searchEngineStepService.finalStep(context);
  }

  private async startFallbackOrSecondSearchForSpecifiedCompany(context: IGroupSearchContext): Promise<void> {
    context.query = this.searchEngineStepService.initializeQuery();
    context.sendNotifications = false;
    context.isFirstSearchCompleted = true;
    context.isSecondSearchCompleted = true;
    context.isSearchNeeded = false;

    if (!(await this.searchEngineStepService.applyStepWorkingHours(context))) {
      return;
    }

    if (!(await this.searchEngineStepService.applyStepService(context))) {
      return;
    }

    if (context.order.communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
      if (!(await this.searchEngineStepService.applyStepFaceToFacePreBooked(context))) {
        return;
      }
    }

    if (!(await this.searchEngineStepService.applyStepGender(context))) {
      return;
    }

    if (context.order.languageFrom !== ELanguages.ENGLISH && context.order.languageTo !== ELanguages.ENGLISH) {
      if (!context.group.sameInterpreter) {
        if (!(await this.searchEngineStepService.applyStepFreeSlots(context))) {
          return;
        }
      }

      if (!(await this.searchEngineStepService.applyStepBlacklist(context))) {
        return;
      }

      if (!context.group.acceptOvertimeRates) {
        if (!(await this.searchEngineStepService.applyStepTimeZoneRate(context))) {
          return;
        }
      }

      context.isOrderSaved = await this.searchEngineStepService.finalStep(context);

      return;
    }

    if (!context.group.sameInterpreter) {
      if (!(await this.searchEngineStepService.applyStepWithoutNaatiFirstLevelOrFreeSlot(context))) {
        return;
      }
    } else {
      if (!(await this.searchEngineStepService.applyStepWithoutNaatiFirstLevelIgnoreFreeSlot(context))) {
        return;
      }
    }

    if (!(await this.searchEngineStepService.applyStepBlacklist(context))) {
      return;
    }

    if (!context.group.acceptOvertimeRates) {
      if (!(await this.searchEngineStepService.applyStepTimeZoneRate(context))) {
        return;
      }
    }

    context.isOrderSaved = await this.searchEngineStepService.finalStep(context);
  }
}
