import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDiscountEntryFeePropertyToProductListing1746949610216
  implements MigrationInterface
{
  name = 'AddDiscountEntryFeePropertyToProductListing1746949610216';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "stripeCustomerAccountId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_67e7c110371847906499d288b71" UNIQUE ("stripeCustomerAccountId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_listing" ADD "discount" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_listing" ADD "entryFee" numeric(10,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_listing" DROP COLUMN "entryFee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_listing" DROP COLUMN "discount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "UQ_67e7c110371847906499d288b71"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "stripeCustomerAccountId"`,
    );
  }
}
