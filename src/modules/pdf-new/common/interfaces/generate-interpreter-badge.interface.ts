import { TCreateOrUpdateInterpreterBadgePdf } from "src/modules/interpreters/badge/common/types";

export interface IGenerateInterpreterBadge {
  userRole: TCreateOrUpdateInterpreterBadgePdf;
  newInterpreterBadge?: string;
}
