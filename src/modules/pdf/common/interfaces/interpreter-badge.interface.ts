import { EUserTitle } from "src/modules/users/common/enums";

export interface IInterpreterBadge {
  userRoleId: string;
  platformId: string;
  firstName: string;
  lastName: string;
  title: EUserTitle;
  interpreterRole: string;
  avatar: string;
  averageRating: number;
  interpreterBadge: string;
  companyName?: string;
}

export interface IInterpreterBadgeWithKey {
  interpreterBadgeKey: string;
  interpreterBadgeData: IInterpreterBadge;
}
