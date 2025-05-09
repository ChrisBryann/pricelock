import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveUniqueConstriantCommitmentIdToPayment1746810302789 implements MigrationInterface {
    name = 'RemoveUniqueConstriantCommitmentIdToPayment1746810302789'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment" DROP CONSTRAINT "UQ_01c51134bda7f581fcda18096c9"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment" ADD CONSTRAINT "UQ_01c51134bda7f581fcda18096c9" UNIQUE ("commitmentId")`);
    }

}
