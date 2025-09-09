import { Injectable } from "@nestjs/common";
import { SearchEngineStepService } from "src/modules/search-engine-logic/services";
import { COMPANY_LFH_FULL_NAME } from "src/modules/companies/common/constants/constants";
import { EAppointmentCommunicationType } from "src/modules/appointments/appointment/common/enums";
import { ISearchContextBase } from "src/modules/search-engine-logic/common/interface";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { addMinutes } from "date-fns";
import { NUMBER_OF_MINUTES_IN_HALF_HOUR } from "src/common/constants";
import { ENaatiLevelStepResult } from "src/modules/search-engine-logic/common/enum";

@Injectable()
export class SearchEnginePreBookOrderService {
  constructor(private readonly searchEngineStepService: SearchEngineStepService) {}

  public async startSearchEngineForOrder(context: ISearchContextBase): Promise<void> {
    if (context.order.operatedByCompanyName === COMPANY_LFH_FULL_NAME) {
      await this.startSearchEngineForLfhCompany(context);
    } else {
      await this.startSearchEngineForOthersCompany(context);
    }
  }

  private async startSearchEngineForLfhCompany(context: ISearchContextBase): Promise<void> {
    if (!context.isFirstSearchCompleted) {
      await this.startFirstSearchEngineForLfhCompany(context);
    } else {
      await this.startSecondSearchEngineForLfhCompany(context);
    }
  }

  private async startFirstSearchEngineForLfhCompany(context: ISearchContextBase): Promise<void> {
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
      if (!(await this.searchEngineStepService.applyStepFreeSlots(context))) {
        return;
      }

      if (!(await this.searchEngineStepService.applyStepBlacklist(context))) {
        return;
      }

      if (!context.order.acceptOvertimeRates) {
        if (!(await this.searchEngineStepService.applyStepTimeZoneRate(context))) {
          return;
        }
      }

      context.isOrderSaved = await this.searchEngineStepService.finalStep(context);

      return;
    }

    const naatiResult = await this.searchEngineStepService.applyNaatiLevelStepsWithFreeSlot(context);

    if (
      naatiResult === ENaatiLevelStepResult.FOURTH_AND_THIRD ||
      naatiResult === ENaatiLevelStepResult.SECOND_AND_FIRST
    ) {
      if (!(await this.searchEngineStepService.applyStepBlacklist(context))) {
        return;
      }

      if (!context.order.acceptOvertimeRates) {
        if (!(await this.searchEngineStepService.applyStepTimeZoneRate(context))) {
          return;
        }
      }

      context.isOrderSaved = await this.searchEngineStepService.finalStep(context);
    } else {
      return;
    }
  }

  private async startSecondSearchEngineForLfhCompany(context: ISearchContextBase): Promise<void> {
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

    if (!(await this.searchEngineStepService.applyStepWithoutNaatiFirstLevelOrFreeSlot(context))) {
      return;
    }

    if (!(await this.searchEngineStepService.applyStepBlacklist(context))) {
      return;
    }

    if (!context.order.acceptOvertimeRates) {
      if (!(await this.searchEngineStepService.applyStepTimeZoneRate(context))) {
        return;
      }
    }

    context.isOrderSaved = await this.searchEngineStepService.finalStep(context);
  }

  private async startSearchEngineForOthersCompany(context: ISearchContextBase): Promise<void> {
    if (!context.isFirstSearchCompleted) {
      await this.startFirstSearchEngineForSpecifiedCompany(context);
    } else {
      await this.startFallbackOrSecondSearchForSpecifiedCompany(context);
    }
  }

  private async startFirstSearchEngineForSpecifiedCompany(context: ISearchContextBase): Promise<void> {
    if (!(await this.startPreSearchForSpecifiedCompany(context))) {
      return;
    }

    if (context.isCompanyHasInterpreters) {
      await this.startFirstSearchForSpecifiedCompany(context);
    } else {
      await this.startFallbackOrSecondSearchForSpecifiedCompany(context);
    }
  }

  private async startPreSearchForSpecifiedCompany(context: ISearchContextBase): Promise<boolean> {
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

  private async startFirstSearchForSpecifiedCompany(context: ISearchContextBase): Promise<void> {
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

    if (!(await this.searchEngineStepService.applyStepFreeSlots(context))) {
      return;
    }

    if (!(await this.searchEngineStepService.applyStepBlacklist(context))) {
      return;
    }

    if (!context.order.acceptOvertimeRates) {
      if (!(await this.searchEngineStepService.applyStepTimeZoneRate(context))) {
        return;
      }
    }

    context.isOrderSaved = await this.searchEngineStepService.finalStep(context);
  }

  private async startFallbackOrSecondSearchForSpecifiedCompany(context: ISearchContextBase): Promise<void> {
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
      if (!(await this.searchEngineStepService.applyStepFreeSlots(context))) {
        return;
      }

      if (!(await this.searchEngineStepService.applyStepBlacklist(context))) {
        return;
      }

      if (!context.order.acceptOvertimeRates) {
        if (!(await this.searchEngineStepService.applyStepTimeZoneRate(context))) {
          return;
        }
      }

      context.isOrderSaved = await this.searchEngineStepService.finalStep(context);

      return;
    }

    if (!(await this.searchEngineStepService.applyStepWithoutNaatiFirstLevelOrFreeSlot(context))) {
      return;
    }

    if (!(await this.searchEngineStepService.applyStepBlacklist(context))) {
      return;
    }

    if (!context.order.acceptOvertimeRates) {
      if (!(await this.searchEngineStepService.applyStepTimeZoneRate(context))) {
        return;
      }
    }

    context.isOrderSaved = await this.searchEngineStepService.finalStep(context);
  }
}
