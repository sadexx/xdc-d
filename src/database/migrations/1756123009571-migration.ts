import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1756123009571 implements MigrationInterface {
    name = 'Migration1756123009571'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "promo_campaigns" ADD "banner_display" boolean NOT NULL`);
        await queryRunner.query(`ALTER TABLE "promo_campaigns" ADD "conditions_url" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "promo_campaigns" DROP COLUMN "conditions_url"`);
        await queryRunner.query(`ALTER TABLE "promo_campaigns" DROP COLUMN "banner_display"`);
    }

}