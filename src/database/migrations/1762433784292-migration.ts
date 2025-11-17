import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1762433784292 implements MigrationInterface {
    name = 'Migration1762433784292'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" ADD "estimated_cost_amount" numeric(12,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "customer_type" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "payment_method_info" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "incoming_payments_wait_list" DROP CONSTRAINT "incoming_payments_wait_list_appointments_FK"`);
        await queryRunner.query(`ALTER TABLE "incoming_payments_wait_list" ALTER COLUMN "appointment_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "incoming_payments_wait_list" ADD CONSTRAINT "incoming_payments_wait_list_appointments_FK" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "incoming_payments_wait_list" DROP CONSTRAINT "incoming_payments_wait_list_appointments_FK"`);
        await queryRunner.query(`ALTER TABLE "incoming_payments_wait_list" ALTER COLUMN "appointment_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "incoming_payments_wait_list" ADD CONSTRAINT "incoming_payments_wait_list_appointments_FK" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "payment_method_info" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "customer_type" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "estimated_cost_amount"`);
    }

}
