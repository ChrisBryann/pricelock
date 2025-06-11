import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEntryFeeAttributesToPaymentTable1748562727994
  implements MigrationInterface
{
  name = 'AddEntryFeeAttributesToPaymentTable1748562727994';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "UQ_4f1a3ee2c5a576a7588bd4cf7ed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP COLUMN "stripeSessionId"`,
    );
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN "amount"`);
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "UQ_aaf4912b634282efbc202ebd4d1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP COLUMN "stripePaymentIntentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD "stripeFinalPaymentSessionId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "UQ_0f9eb988f2ef30082afa1caf0b1" UNIQUE ("stripeFinalPaymentSessionId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD "entryFeeAmount" numeric(15,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD "finalAmount" numeric(15,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD "stripeEntryFeePaymentIntentId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "UQ_0de155e0ffe3f55f99653d0470e" UNIQUE ("stripeEntryFeePaymentIntentId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD "stripeFinalPaymentIntentId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "UQ_6904b158661560816f2a3a473f4" UNIQUE ("stripeFinalPaymentIntentId")`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."payment_status_enum" RENAME TO "payment_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payment_status_enum" AS ENUM('entry_paid', 'entry_failed', 'pending', 'success', 'failed', 'expired')`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ALTER COLUMN "status" TYPE "public"."payment_status_enum" USING "status"::"text"::"public"."payment_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."payment_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."payment_status_enum_old" AS ENUM('inactive', 'pending', 'success', 'failed', 'expired')`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ALTER COLUMN "status" TYPE "public"."payment_status_enum_old" USING "status"::"text"::"public"."payment_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(`DROP TYPE "public"."payment_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."payment_status_enum_old" RENAME TO "payment_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "UQ_6904b158661560816f2a3a473f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP COLUMN "stripeFinalPaymentIntentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "UQ_0de155e0ffe3f55f99653d0470e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP COLUMN "stripeEntryFeePaymentIntentId"`,
    );
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN "finalAmount"`);
    await queryRunner.query(
      `ALTER TABLE "payment" DROP COLUMN "entryFeeAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "UQ_0f9eb988f2ef30082afa1caf0b1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP COLUMN "stripeFinalPaymentSessionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD "stripePaymentIntentId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "UQ_aaf4912b634282efbc202ebd4d1" UNIQUE ("stripePaymentIntentId")`,
    );
    await queryRunner.query(`ALTER TABLE "payment" ADD "amount" numeric(15,2)`);
    await queryRunner.query(
      `ALTER TABLE "payment" ADD "stripeSessionId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "UQ_4f1a3ee2c5a576a7588bd4cf7ed" UNIQUE ("stripeSessionId")`,
    );
  }
}
