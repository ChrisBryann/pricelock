import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTransactionalOutboxTable1749053576151 implements MigrationInterface {
    name = 'AddTransactionalOutboxTable1749053576151'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "transactional_outbox" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deletedAt" TIMESTAMP, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "channel" character varying(50) NOT NULL, "eventType" character varying(100) NOT NULL, "payload" jsonb NOT NULL, "processed" boolean NOT NULL DEFAULT false, "retryCount" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_dc188bd5044400c6f955dd977fc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8271bb00844244366c905a135f" ON "transactional_outbox" ("channel") `);
        await queryRunner.query(`CREATE INDEX "IDX_4bd529428c3434d41e0e547099" ON "transactional_outbox" ("eventType") `);
        await queryRunner.query(`CREATE INDEX "IDX_054c720228c34ae9a23497e614" ON "transactional_outbox" ("processed") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_054c720228c34ae9a23497e614"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4bd529428c3434d41e0e547099"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8271bb00844244366c905a135f"`);
        await queryRunner.query(`DROP TABLE "transactional_outbox"`);
    }

}
