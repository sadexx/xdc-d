import { TCreateOrUpdateInterpreterBadgePdf } from "src/modules/interpreters/badge/common/types";

export interface IInterpreterBadge {
  userRole: TCreateOrUpdateInterpreterBadgePdf;
  interpreterBadge: string;
  interpreterRole: string;
  companyName?: string;
}
