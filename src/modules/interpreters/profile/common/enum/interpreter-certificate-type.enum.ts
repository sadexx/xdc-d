import { ValuesOf } from "src/common/types";

export const EInterpreterCertificateType = {
  NAATI: "naati",
  IELTS: "ielts",
  OTHER: "other",
} as const;

export type EInterpreterCertificateType = ValuesOf<typeof EInterpreterCertificateType>;

export const interpreterCertificateTypeOrder = {
  [EInterpreterCertificateType.NAATI]: 1,
  [EInterpreterCertificateType.IELTS]: 2,
  [EInterpreterCertificateType.OTHER]: 3,
} as const satisfies Record<EInterpreterCertificateType, number>;
