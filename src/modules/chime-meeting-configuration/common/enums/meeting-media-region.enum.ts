import { ValuesOf } from "src/common/types";

export const EMeetingMediaRegion = {
  AFRICA_CAPE_TOWN: "af-south-1",
  ASIA_PACIFIC_MUMBAI: "ap-south-1",
  ASIA_PACIFIC_SEOUL: "ap-northeast-2",
  ASIA_PACIFIC_SINGAPORE: "ap-southeast-1",
  ASIA_PACIFIC_SYDNEY: "ap-southeast-2",
  ASIA_PACIFIC_TOKYO: "ap-northeast-1",
  CANADA_CENTRAL: "ca-central-1",
  EUROPE_FRANKFURT: "eu-central-1",
  EUROPE_IRELAND: "eu-west-1",
  EUROPE_LONDON: "eu-west-2",
  EUROPE_MILAN: "eu-south-1",
  EUROPE_PARIS: "eu-west-3",
  EUROPE_STOCKHOLM: "eu-north-1",
  ISRAEL_TEL_AVIV: "il-central-1",
  SOUTH_AMERICA_SAO_PAULO: "sa-east-1",
  US_EAST_OHIO: "us-east-2",
  US_EAST_N_VIRGINIA: "us-east-1",
  US_WEST_N_CALIFORNIA: "us-west-1",
  US_WEST_OREGON: "us-west-2",
  AWS_GOVCLOUD_US_EAST: "us-gov-east-1",
  AWS_GOVCLOUD_US_WEST: "us-gov-west-1",
} as const;

export type EMeetingMediaRegion = ValuesOf<typeof EMeetingMediaRegion>;
