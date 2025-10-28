import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import { ECommonErrorCodes } from "src/common/enums";

@Injectable()
export class NotEmptyBodyPipe<T = Record<string, unknown>> implements PipeTransform<T, T> {
  transform(value: T): T {
    if (!value || typeof value !== "object") {
      throw new BadRequestException(ECommonErrorCodes.BODY_MUST_BE_NON_EMPTY_OBJECT);
    }

    const objectKeys = Object.keys(value);

    if (objectKeys.length === 0 || Object.values(value).every((val) => val === undefined)) {
      throw new BadRequestException(ECommonErrorCodes.BODY_MUST_BE_NON_EMPTY_OBJECT);
    }

    return value;
  }
}
