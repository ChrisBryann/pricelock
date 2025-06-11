import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEntryFeeSessionIdPropertyToPaymentTable1749060115735 implements MigrationInterface {
    name = 'AddEntryFeeSessionIdPropertyToPaymentTable1749060115735'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment" ADD "stripeEntryFeePaymentSessionId" character varying`);
        await queryRunner.query(`ALTER TABLE "payment" ADD CONSTRAINT "UQ_a7f12c4fcbf43728b5bfe331651" UNIQUE ("stripeEntryFeePaymentSessionId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment" DROP CONSTRAINT "UQ_a7f12c4fcbf43728b5bfe331651"`);
        await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN "stripeEntryFeePaymentSessionId"`);
    }

}
