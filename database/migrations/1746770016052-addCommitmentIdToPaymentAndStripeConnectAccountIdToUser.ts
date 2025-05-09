import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCommitmentIdToPaymentAndStripeConnectAccountIdToUser1746770016052 implements MigrationInterface {
    name = 'AddCommitmentIdToPaymentAndStripeConnectAccountIdToUser1746770016052'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "stripeConnectAccountId" character varying`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_440aff67474de7af33ce81a6b01" UNIQUE ("stripeConnectAccountId")`);
        await queryRunner.query(`ALTER TABLE "user" ADD "stripeConnectAccountLinked" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "payment" ADD "commitmentId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payment" ADD CONSTRAINT "UQ_01c51134bda7f581fcda18096c9" UNIQUE ("commitmentId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment" DROP CONSTRAINT "UQ_01c51134bda7f581fcda18096c9"`);
        await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN "commitmentId"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "stripeConnectAccountLinked"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_440aff67474de7af33ce81a6b01"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "stripeConnectAccountId"`);
    }

}
