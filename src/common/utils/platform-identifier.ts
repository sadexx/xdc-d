import { DataSource } from "typeorm";
import { InternalServerErrorException } from "@nestjs/common";
import { ESequenceName } from "src/common/enums";
import { SingleLokiLogger } from "src/common/logger";

let dataSourceInstance: DataSource;

export const setDataSource = (dataSource: DataSource): void => {
  dataSourceInstance = dataSource;
};

export const getDataSource = (): DataSource => {
  if (!dataSourceInstance) {
    throw new InternalServerErrorException(
      "DataSource has not been initialized yet. " +
        " Ensure AppInitializerService is loaded before entities that use setPlatformId.",
    );
  }

  return dataSourceInstance;
};

export const setPlatformId = async (sequenceName: ESequenceName, attemptCount = 1): Promise<string> => {
  const START_VALUE = 1000;
  const MIN_LENGTH = 6;
  const MAX_ATTEMPT_COUNT = 2;
  const INCREMENT_STEP = 1;

  const dataSource = getDataSource();

  try {
    const result = await dataSource.query<{ nextval: string }[]>(`SELECT nextval('${sequenceName}')`);

    // return String(parseInt(result[0].nextval, 10)).padStart(MIN_LENGTH, "0");
    return result[0].nextval.padStart(MIN_LENGTH, "0");
  } catch (error) {
    const typedError = error as Error & { name?: string };

    if (attemptCount > MAX_ATTEMPT_COUNT) {
      SingleLokiLogger.error(
        `Failed to create platform Id for sequenceName: ${sequenceName} message: ${typedError.message}, ${typedError.stack}`,
      );
      throw new InternalServerErrorException("Platform ID creating error");
    }

    if (typedError?.name === "QueryFailedError") {
      await dataSource.query(
        `CREATE SEQUENCE ${sequenceName} START WITH ${START_VALUE} INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;`,
      );

      return setPlatformId(sequenceName, attemptCount + INCREMENT_STEP);
    }

    SingleLokiLogger.error(
      `Failed to create platform Id for sequenceName: ${sequenceName} message: ${typedError.message}, ${typedError.stack}`,
    );
    throw new InternalServerErrorException("Platform ID creating error");
  }
};
