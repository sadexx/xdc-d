import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { ValidationSchema } from "src/config/env/validation-schema";

export function validate(config: Record<string, unknown>): ValidationSchema {
  const validatedConfig = plainToInstance(ValidationSchema, config);

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
