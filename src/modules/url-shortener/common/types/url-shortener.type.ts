import { FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { ShortUrl } from "src/modules/url-shortener/entities";

/**
 ** Query types
 */

export const ResolveShortUrlQuery = {
  select: { id: true, activeFrom: true, destinationUrl: true } as const satisfies FindOptionsSelect<ShortUrl>,
};
export type TResolveShortUrl = QueryResultType<ShortUrl, typeof ResolveShortUrlQuery.select>;
