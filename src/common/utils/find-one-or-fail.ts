import { HttpException, HttpStatus, NotFoundException } from "@nestjs/common";
import { FindOneOptions, ObjectLiteral, Repository, SelectQueryBuilder } from "typeorm";

export async function findOneOrFail<T extends ObjectLiteral>(
  value: string,
  repository: Repository<T>,
  options: FindOneOptions<T>,
  searchFieldName: string = "Id",
  customErrorText?: string,
): Promise<T> {
  const STANDARD_ERROR_MESSAGE = `${repository.metadata.name} not found with specified field:${searchFieldName}, value: ${value}`;

  const entity = await repository.findOne(options);

  if (!entity) {
    const errorText = customErrorText ?? STANDARD_ERROR_MESSAGE;

    throw new HttpException(errorText, HttpStatus.NOT_FOUND);
  }

  return entity;
}

export async function findOneOrFailQueryBuilder<T extends ObjectLiteral>(
  value: string,
  queryBuilder: SelectQueryBuilder<T>,
  entityName: string,
  searchFieldName: string = "Id",
): Promise<T> {
  const entity = await queryBuilder.getOne();

  if (!entity) {
    throw new NotFoundException(`${entityName} not found with specified field:${searchFieldName}, value: ${value}`);
  }

  return entity;
}
