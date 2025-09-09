import { PaginationOutput } from "src/common/outputs";
import { TGetAllPromoCampaigns } from "src/modules/promo-campaigns/common/types";

export interface GetAllPromoCampaignsOutput extends PaginationOutput {
  data: TGetAllPromoCampaigns[];
}
