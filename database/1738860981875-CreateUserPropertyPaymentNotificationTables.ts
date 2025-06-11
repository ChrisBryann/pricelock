import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserPropertyPaymentNotificationTables1738860981875 implements MigrationInterface {
    name = 'CreateUserPropertyPaymentNotificationTables1738860981875'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('buyer', 'seller', 'admin')`);
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50) NOT NULL, "phone" character varying(20) NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "role" "public"."user_role_enum" NOT NULL, "ktpVerified" boolean NOT NULL DEFAULT false, "phoneVerified" boolean NOT NULL DEFAULT false, "emailVerified" boolean NOT NULL DEFAULT false, "tokenVersion" integer NOT NULL DEFAULT '0', "refreshToken" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deletedAt" TIMESTAMP, CONSTRAINT "UQ_8e1f623798118e629b46a9e6299" UNIQUE ("phone"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2719e95bc6f61fababbfa6d05c" ON "user" ("phone", "email", "id") `);
        await queryRunner.query(`CREATE TYPE "public"."notification_type_enum" AS ENUM('sms', 'email', 'whatsapp', 'in_app')`);
        await queryRunner.query(`CREATE TYPE "public"."notification_status_enum" AS ENUM('sent', 'failed', 'pending')`);
        await queryRunner.query(`CREATE TABLE "notification" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."notification_type_enum" NOT NULL, "content" text NOT NULL, "status" "public"."notification_status_enum" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deletedAt" TIMESTAMP, "userIdId" uuid, CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."property_type_enum" AS ENUM('rumah', 'apartemen', 'tanah', 'ruko', 'villa')`);
        await queryRunner.query(`CREATE TYPE "public"."property_certificatetype_enum" AS ENUM('SHM', 'HGG', 'Girik')`);
        await queryRunner.query(`CREATE TABLE "property" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "type" "public"."property_type_enum" NOT NULL, "province" character varying(100) NOT NULL, "city" character varying(100) NOT NULL, "district" character varying(100) NOT NULL, "price" numeric(15,2) NOT NULL, "certificateType" "public"."property_certificatetype_enum" NOT NULL, "isSyariah" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deletedAt" TIMESTAMP, "sellerIdId" uuid, CONSTRAINT "PK_d80743e6191258a5003d5843b4f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."payment_status_enum" AS ENUM('pending', 'success', 'failed', 'expired')`);
        await queryRunner.query(`CREATE TABLE "payment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "invoice_id" character varying(255) NOT NULL, "amount" numeric(15,2) NOT NULL, "status" "public"."payment_status_enum" NOT NULL DEFAULT 'pending', "paymentChannel" character varying(50) NOT NULL, "isSyariah" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deletedAt" TIMESTAMP, "propertyIdId" uuid, "buyerIdId" uuid, CONSTRAINT "UQ_20cc84d8a2274ae86f551360c11" UNIQUE ("invoice_id"), CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "city" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "provinceId" uuid NOT NULL, CONSTRAINT "PK_b222f51ce26f7e5ca86944a6739" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "district" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "cityId" uuid NOT NULL, CONSTRAINT "PK_ee5cb6fd5223164bb87ea693f1e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "property_image" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "url" character varying(255) NOT NULL, "propertyIdId" uuid, CONSTRAINT "PK_7bc43b89d4104149dddea18cdf8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "province" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, CONSTRAINT "PK_4f461cb46f57e806516b7073659" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_12b3b30c2d4e21dc186cff3afaa" FOREIGN KEY ("userIdId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "property" ADD CONSTRAINT "FK_0be02a9dfb60f3a8affbdd1a8e6" FOREIGN KEY ("sellerIdId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment" ADD CONSTRAINT "FK_1e4855efd4dd8db64d917900342" FOREIGN KEY ("propertyIdId") REFERENCES "property"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment" ADD CONSTRAINT "FK_d7478ba690c57a6a3f32bed756c" FOREIGN KEY ("buyerIdId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "property_image" ADD CONSTRAINT "FK_2e716a7ca7d1ecd4b409982b6b3" FOREIGN KEY ("propertyIdId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "property_image" DROP CONSTRAINT "FK_2e716a7ca7d1ecd4b409982b6b3"`);
        await queryRunner.query(`ALTER TABLE "payment" DROP CONSTRAINT "FK_d7478ba690c57a6a3f32bed756c"`);
        await queryRunner.query(`ALTER TABLE "payment" DROP CONSTRAINT "FK_1e4855efd4dd8db64d917900342"`);
        await queryRunner.query(`ALTER TABLE "property" DROP CONSTRAINT "FK_0be02a9dfb60f3a8affbdd1a8e6"`);
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_12b3b30c2d4e21dc186cff3afaa"`);
        await queryRunner.query(`DROP TABLE "province"`);
        await queryRunner.query(`DROP TABLE "property_image"`);
        await queryRunner.query(`DROP TABLE "district"`);
        await queryRunner.query(`DROP TABLE "city"`);
        await queryRunner.query(`DROP TABLE "payment"`);
        await queryRunner.query(`DROP TYPE "public"."payment_status_enum"`);
        await queryRunner.query(`DROP TABLE "property"`);
        await queryRunner.query(`DROP TYPE "public"."property_certificatetype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."property_type_enum"`);
        await queryRunner.query(`DROP TABLE "notification"`);
        await queryRunner.query(`DROP TYPE "public"."notification_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notification_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2719e95bc6f61fababbfa6d05c"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    }

}
