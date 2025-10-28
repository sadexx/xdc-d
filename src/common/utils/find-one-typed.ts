import { HttpException, HttpStatus } from "@nestjs/common";
import { FindOneOptions, ObjectLiteral, Repository, SelectQueryBuilder } from "typeorm";
import { SingleLokiLogger } from "src/common/logger";
import { ECommonErrorCodes } from "src/common/enums";

/**
 * Finds one entity by given options and returns it as given type, or null if not found.
 *
 * @param repository typeorm Repository instance
 * @param options typeorm FindOne options
 *
 * @returns found entity as given type (TReturnType), or null if not found
 */
export async function findOneTyped<TReturnType>(
  repository: Repository<ObjectLiteral>,
  options: FindOneOptions<ObjectLiteral>,
): Promise<TReturnType | null> {
  const entity = await repository.findOne(options);

  if (!entity) {
    return null;
  }

  return entity as TReturnType;
}

/**
 * Finds one entity using a query builder by given options and returns it as given type, or null if not found.
 *
 * @param queryBuilder typeorm SelectQueryBuilder instance
 *
 * @returns found entity as given type (TReturnType), or null if not found
 */
export async function findOneQueryBuilderTyped<TReturnType>(
  queryBuilder: SelectQueryBuilder<ObjectLiteral>,
): Promise<TReturnType | null> {
  const entity = await queryBuilder.getOne();

  if (!entity) {
    return null;
  }

  return entity as TReturnType;
}

/**
 * Finds one entity by given value and options, or throws a NotFound or custom HttpException if not found.
 *
 * @param value value to search for
 * @param repository typeorm Repository instance
 * @param options typeorm FindOne options
 * @param searchFieldName name of the field to search for value
 * @param customErrorCode HTTP status code for custom error
 * @param customErrorText custom error message text
 *
 * @throws {NotFoundException} if not found
 * @throws {HttpException} if customErrorCode and customErrorText are provided
 *
 * @returns found entity as given type (TReturnType)
 */
export async function findOneOrFailTyped<TReturnType>(
  value: string,
  repository: Repository<ObjectLiteral>,
  options: FindOneOptions<ObjectLiteral>,
  searchFieldName: string = "Id",
): Promise<TReturnType> {
  const entity = await repository.findOne(options);

  if (!entity) {
    SingleLokiLogger.error(
      `${repository.metadata.name} not found with specified field:${searchFieldName}, value: ${value}`,
    );
    throw new HttpException(ECommonErrorCodes.ENTITY_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  return entity as TReturnType;
}

/**
 * Finds one entity using a query builder by given value, or throws a NotFoundException if not found.
 *
 * @param value value to search for
 * @param queryBuilder typeorm SelectQueryBuilder instance
 * @param entityName name of the entity being queried
 * @param searchFieldName name of the field to search for value
 *
 * @throws {NotFoundException} if the entity is not found
 *
 * @returns found entity as given type (TReturnType)
 */

export async function findOneOrFailQueryBuilderTyped<TReturnType>(
  value: string,
  queryBuilder: SelectQueryBuilder<ObjectLiteral>,
  entityName: string,
  searchFieldName: string = "Id",
): Promise<TReturnType> {
  const entity = await queryBuilder.getOne();

  if (!entity) {
    SingleLokiLogger.error(`${entityName} not found with specified field:${searchFieldName}, value: ${value}`);
    throw new HttpException(ECommonErrorCodes.ENTITY_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  return entity as TReturnType;
}
