import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1764586975157 implements MigrationInterface {
    name = 'Migration1764586975157'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."companies_funding_source_enum" AS ENUM('deposit', 'post-payment')`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "funding_source" "public"."companies_funding_source_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."payments_system_enum" RENAME TO "payments_system_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."payments_system_enum" AS ENUM('stripe', 'paypal', 'deposit', 'post-payment')`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "system" TYPE "public"."payments_system_enum" USING "system"::"text"::"public"."payments_system_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payments_system_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."payment_items_status_enum" RENAME TO "payment_items_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."payment_items_status_enum" AS ENUM('created', 'authorized', 'authorization-failed', 'captured', 'capture-failed', 'canceled', 'cancel-failed', 'success', 'failed', 'transfered', 'transfer-failed', 'payout-success', 'payout-failed', 'payment-request-initializing', 'payment-request-creating', 'bank-account-charge-pending', 'payment-request-created', 'bank-account-charge-transaction-created', 'bank-account-charge-succeeded', 'payment-request-succeeded', 'refund', 'payment-waiting-for-payout', 'pending-payment', 'invoiced')`);
        await queryRunner.query(`ALTER TABLE "payment_items" ALTER COLUMN "status" TYPE "public"."payment_items_status_enum" USING "status"::"text"::"public"."payment_items_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payment_items_status_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."payments_information_interpreter_system_for_payout_enum" RENAME TO "payments_information_interpreter_system_for_payout_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."payments_information_interpreter_system_for_payout_enum" AS ENUM('stripe', 'paypal', 'deposit', 'post-payment')`);
        await queryRunner.query(`ALTER TABLE "payments_information" ALTER COLUMN "interpreter_system_for_payout" TYPE "public"."payments_information_interpreter_system_for_payout_enum" USING "interpreter_system_for_payout"::"text"::"public"."payments_information_interpreter_system_for_payout_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payments_information_interpreter_system_for_payout_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."payments_information_interpreter_system_for_payout_enum_old" AS ENUM('deposit', 'paypal', 'stripe')`);
        await queryRunner.query(`ALTER TABLE "payments_information" ALTER COLUMN "interpreter_system_for_payout" TYPE "public"."payments_information_interpreter_system_for_payout_enum_old" USING "interpreter_system_for_payout"::"text"::"public"."payments_information_interpreter_system_for_payout_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."payments_information_interpreter_system_for_payout_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."payments_information_interpreter_system_for_payout_enum_old" RENAME TO "payments_information_interpreter_system_for_payout_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."payment_items_status_enum_old" AS ENUM('authorization-failed', 'authorized', 'bank-account-charge-pending', 'bank-account-charge-succeeded', 'bank-account-charge-transaction-created', 'cancel-failed', 'canceled', 'capture-failed', 'captured', 'created', 'failed', 'payment-request-created', 'payment-request-creating', 'payment-request-initializing', 'payment-request-succeeded', 'payment-waiting-for-payout', 'payout-failed', 'payout-success', 'refund', 'success', 'transfer-failed', 'transfered')`);
        await queryRunner.query(`ALTER TABLE "payment_items" ALTER COLUMN "status" TYPE "public"."payment_items_status_enum_old" USING "status"::"text"::"public"."payment_items_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."payment_items_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."payment_items_status_enum_old" RENAME TO "payment_items_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."payments_system_enum_old" AS ENUM('deposit', 'paypal', 'stripe')`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "system" TYPE "public"."payments_system_enum_old" USING "system"::"text"::"public"."payments_system_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."payments_system_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."payments_system_enum_old" RENAME TO "payments_system_enum"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "funding_source"`);
        await queryRunner.query(`DROP TYPE "public"."companies_funding_source_enum"`);
    }

}
