import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1756114839533 implements MigrationInterface {
    name = 'Migration1756114839533'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."migration_logs_migration_type_enum" AS ENUM('applied', 'rollback')`);
        await queryRunner.query(`CREATE TABLE "migration_logs" ("id" SERIAL NOT NULL, "migration_file_name" character varying NOT NULL, "applied_by" character varying NOT NULL, "migration_type" "public"."migration_logs_migration_type_enum" NOT NULL, "sql_text" text NOT NULL, "notes" text, "creation_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "migration_logs_PK" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "migration_logs_migration_file_name_UQ" ON "migration_logs" ("migration_file_name", "migration_type") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."migration_logs_migration_file_name_UQ"`);
        await queryRunner.query(`DROP TABLE "migration_logs"`);
        await queryRunner.query(`DROP TYPE "public"."migration_logs_migration_type_enum"`);
    }

}