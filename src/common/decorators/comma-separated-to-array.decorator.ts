import { Transform } from "class-transformer";

export const CommaSeparatedToArray = (): PropertyDecorator =>
  Transform(({ value }: { value: string | number }) => {
    if (typeof value === "string") {
      return value.split(",").map((item) => {
        const trimmedString = item.trim();
        const trimmedNumber = Number(trimmedString);

        return !isNaN(trimmedNumber) ? trimmedNumber : trimmedString;
      });
    }

    return value;
  });
