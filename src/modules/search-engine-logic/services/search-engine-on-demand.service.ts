import { Injectable } from "@nestjs/common";
import { EAppointmentCommunicationType } from "src/modules/appointments/appointment/common/enums";
import { SearchEngineStepService } from "src/modules/search-engine-logic/services";
import { ISearchContextBase } from "src/modules/search-engine-logic/common/interface";

@Injectable()
export class SearchEngineOnDemandService {
  constructor(private readonly searchEngineStepService: SearchEngineStepService) {}

  public async startSearchEngineOnDemand(context: ISearchContextBase): Promise<void> {
    context.isFirstSearchCompleted = true;
    context.isSecondSearchCompleted = false;
    context.isSearchNeeded = false;

    if (!(await this.searchEngineStepService.applyStepWorkingHoursOnDemand(context))) {
      return;
    }

    if (!(await this.searchEngineStepService.applyStepService(context))) {
      return;
    }

    if (context.order.communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
      if (!(await this.searchEngineStepService.applyStepFaceToFaceOnDemand(context))) {
        return;
      }
    }

    if (!(await this.searchEngineStepService.applyStepConsecutiveTopic(context))) {
      return;
    }

    if (!(await this.searchEngineStepService.applyStepGender(context))) {
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
