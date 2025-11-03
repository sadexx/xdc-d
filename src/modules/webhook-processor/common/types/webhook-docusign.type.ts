import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { QueryResultType } from "src/common/types";
import { DocusignContract } from "src/modules/docusign/entities";

/**
 ** Query types
 */

export const ProcessDocusignWebhookQuery = {
  select: {
    id: true,
    docusignStatus: true,
    s3ContractKey: true,
    sendDate: true,
    userRole: { id: true, isActive: true, role: { name: true }, user: { id: true, email: true } },
    company: { id: true },
  } as const satisfies FindOptionsSelect<DocusignContract>,
  relations: {
    userRole: { role: true, user: true },
    company: true,
  } as const satisfies FindOptionsRelations<DocusignContract>,
};
export type TProcessDocusignWebhook = QueryResultType<DocusignContract, typeof ProcessDocusignWebhookQuery.select>;
