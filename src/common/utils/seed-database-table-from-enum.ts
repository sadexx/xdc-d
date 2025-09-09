import { SingleLokiLogger } from "src/common/logger";
import { Repository } from "typeorm";

type HasName = { name: string };

export const seedDatabaseTableFromEnum = async <T extends HasName>(
  repository: Repository<T>,
  enumObject: object,
  logContext: string,
): Promise<void> => {
  const enumValues = Object.values(enumObject)
    .filter((value): value is string => typeof value === "string")
    .map((name) => ({ name }) as T);

  const existingEntities = await repository.find();
  const existingNames = new Set(existingEntities.map((entity) => entity.name));

  const newEntities = enumValues.filter((entity) => !existingNames.has(entity.name));

  if (newEntities.length) {
    SingleLokiLogger.warn(`Seeding ${logContext}: ${newEntities.map((entity) => entity.name).join(", ")}`);
    await repository.save(newEntities);
  }
};
