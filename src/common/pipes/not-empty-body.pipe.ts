import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

@Injectable()
export class NotEmptyBodyPipe<T = Record<string, unknown>> implements PipeTransform<T, T> {
  transform(value: T): T {
    if (!value || typeof value !== "object") {
      throw new BadRequestException("The request body must be a non-empty object");
    }

    const objectKeys = Object.keys(value);

    if (objectKeys.length === 0 || Object.values(value).every((val) => val === undefined)) {
      throw new BadRequestException("The request body must be a non-empty object");
    }

    return value;
  }
}
