import { ClassSerializerContextOptions, ClassSerializerInterceptor, PlainLiteralObject } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { instanceToPlain } from "class-transformer";

export class CustomSerializerInterceptor extends ClassSerializerInterceptor {
  constructor(protected override readonly reflector: Reflector) {
    super(reflector);
  }

  override serialize(
    response: PlainLiteralObject | Array<PlainLiteralObject>,
    options: ClassSerializerContextOptions,
  ): PlainLiteralObject | Array<PlainLiteralObject> {
    const groups = options?.groups || [];

    return instanceToPlain(response, { ...options, groups });
  }
}
