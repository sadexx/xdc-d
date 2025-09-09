import { EStringBoolean } from "src/common/enums";

export const envStringToBoolean = (value: string): boolean => {
  if (value === String(EStringBoolean.TRUE)) {
    return true;
  }

  if (value === String(EStringBoolean.FALSE)) {
    return false;
  }

  throw new Error(`Incorrect value: ${value}`);
};
