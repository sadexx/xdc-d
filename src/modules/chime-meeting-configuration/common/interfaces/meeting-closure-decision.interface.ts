import { EMeetingClosureAction } from "src/modules/chime-meeting-configuration/common/enums";

export interface IMeetingClosureDecision {
  action: EMeetingClosureAction;
  reason?: string;
}
