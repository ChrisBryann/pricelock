import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePriceLockTables1744091399869 implements MigrationInterface {
    name = 'CreatePriceLockTables1744091399869'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('buyer', 'seller', 'admin')`);
        await queryRunner.query(`CREATE TABLE "user" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deletedAt" TIMESTAMP, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50) NOT NULL, "phone" character varying(20) NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255), "role" "public"."user_role_enum" NOT NULL, "phoneVerified" boolean NOT NULL DEFAULT false, "emailVerified" boolean NOT NULL DEFAULT false, "tokenVersion" integer NOT NULL DEFAULT '0', "refreshToken" character varying(255), CONSTRAINT "UQ_8e1f623798118e629b46a9e6299" UNIQUE ("phone"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2719e95bc6f61fababbfa6d05c" ON "user" ("phone", "email", "id") `);
        await queryRunner.query(`CREATE TYPE "public"."product_condition_enum" AS ENUM('new', 'like_new', 'used', 'refurbished')`);
        await queryRunner.query(`CREATE TABLE "product" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deletedAt" TIMESTAMP, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "description" text NOT NULL, "category" character varying(100) NOT NULL, "condition" "public"."product_condition_enum" NOT NULL, "sellerId" uuid NOT NULL, CONSTRAINT "PK_bebc9158e480b949565b4dc7a82" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "product_listing" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deletedAt" TIMESTAMP, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "proposedPrice" numeric(10,2) NOT NULL, "minThreshold" integer NOT NULL, "deadline" TIMESTAMP NOT NULL, "locked" boolean NOT NULL DEFAULT false, "finalPrice" numeric(10,2), "expired" boolean NOT NULL DEFAULT false, "productId" uuid NOT NULL, CONSTRAINT "PK_cc64c972fd68c6bce3f9a5b1273" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "commitment" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deletedAt" TIMESTAMP, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" integer NOT NULL, "expired" boolean NOT NULL DEFAULT false, "listingId" uuid NOT NULL, "buyerId" uuid NOT NULL, CONSTRAINT "PK_7a0899978d100f72269b3045d7e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."notification_type_enum" AS ENUM('sms', 'email', 'whatsapp', 'in_app')`);
        await queryRunner.query(`CREATE TABLE "notification" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deletedAt" TIMESTAMP, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."notification_type_enum" array NOT NULL, "content" text NOT NULL, "userId" uuid, CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."order_status_enum" AS ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "order" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deletedAt" TIMESTAMP, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "price" numeric(10,2) NOT NULL, "lockedAt" TIMESTAMP NOT NULL, "shippingAddress" text NOT NULL, "status" "public"."order_status_enum" NOT NULL DEFAULT 'pending', "commitmentId" uuid NOT NULL, "buyerId" uuid NOT NULL, CONSTRAINT "PK_1031171c13130102495201e3e20" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."payment_status_enum" AS ENUM('inactive', 'pending', 'success', 'failed', 'expired')`);
        await queryRunner.query(`CREATE TABLE "payment" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deletedAt" TIMESTAMP, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "stripeSessionId" character varying, "amount" numeric(15,2), "status" "public"."payment_status_enum" NOT NULL DEFAULT 'pending', "stripePaymentIntentId" character varying, "orderId" uuid, CONSTRAINT "UQ_4f1a3ee2c5a576a7588bd4cf7ed" UNIQUE ("stripeSessionId"), CONSTRAINT "UQ_aaf4912b634282efbc202ebd4d1" UNIQUE ("stripePaymentIntentId"), CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "product" ADD CONSTRAINT "FK_d5cac481d22dacaf4d53f900a3f" FOREIGN KEY ("sellerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_listing" ADD CONSTRAINT "FK_275a4d6f43adcee5122987f9f68" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "commitment" ADD CONSTRAINT "FK_e3a3c661dfc12dd8efba5a3f7d4" FOREIGN KEY ("listingId") REFERENCES "product_listing"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "commitment" ADD CONSTRAINT "FK_75d9075d40f82bfae1117c58305" FOREIGN KEY ("buyerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_1ced25315eb974b73391fb1c81b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order" ADD CONSTRAINT "FK_ceca561eb12f7755aa7c9241854" FOREIGN KEY ("commitmentId") REFERENCES "commitment"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order" ADD CONSTRAINT "FK_20981b2b68bf03393c44dd1b9d7" FOREIGN KEY ("buyerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment" ADD CONSTRAINT "FK_d09d285fe1645cd2f0db811e293" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment" DROP CONSTRAINT "FK_d09d285fe1645cd2f0db811e293"`);
        await queryRunner.query(`ALTER TABLE "order" DROP CONSTRAINT "FK_20981b2b68bf03393c44dd1b9d7"`);
        await queryRunner.query(`ALTER TABLE "order" DROP CONSTRAINT "FK_ceca561eb12f7755aa7c9241854"`);
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_1ced25315eb974b73391fb1c81b"`);
        await queryRunner.query(`ALTER TABLE "commitment" DROP CONSTRAINT "FK_75d9075d40f82bfae1117c58305"`);
        await queryRunner.query(`ALTER TABLE "commitment" DROP CONSTRAINT "FK_e3a3c661dfc12dd8efba5a3f7d4"`);
        await queryRunner.query(`ALTER TABLE "product_listing" DROP CONSTRAINT "FK_275a4d6f43adcee5122987f9f68"`);
        await queryRunner.query(`ALTER TABLE "product" DROP CONSTRAINT "FK_d5cac481d22dacaf4d53f900a3f"`);
        await queryRunner.query(`DROP TABLE "payment"`);
        await queryRunner.query(`DROP TYPE "public"."payment_status_enum"`);
        await queryRunner.query(`DROP TABLE "order"`);
        await queryRunner.query(`DROP TYPE "public"."order_status_enum"`);
        await queryRunner.query(`DROP TABLE "notification"`);
        await queryRunner.query(`DROP TYPE "public"."notification_type_enum"`);
        await queryRunner.query(`DROP TABLE "commitment"`);
        await queryRunner.query(`DROP TABLE "product_listing"`);
        await queryRunner.query(`DROP TABLE "product"`);
        await queryRunner.query(`DROP TYPE "public"."product_condition_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2719e95bc6f61fababbfa6d05c"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    }

}
