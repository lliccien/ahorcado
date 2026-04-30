import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1777589808043 implements MigrationInterface {
  name = 'InitialSchema1777589808043';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TABLE "category" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slug" character varying(32) NOT NULL, "name" character varying(64) NOT NULL, "icon" character varying(16) NOT NULL DEFAULT '', "locale" character varying(16) NOT NULL DEFAULT 'es-419', "wordCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "uq_category_slug_locale" UNIQUE ("slug", "locale"), CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cb73208f151aa71cdd78f662d7" ON "category" ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_76480e1b84bc1c58d8af6502d7" ON "category" ("locale") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."word_difficulty_enum" AS ENUM('easy', 'medium', 'hard')`,
    );
    await queryRunner.query(
      `CREATE TABLE "word" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "categoryId" uuid NOT NULL, "text" character varying(64) NOT NULL, "display" character varying(64) NOT NULL, "difficulty" "public"."word_difficulty_enum" NOT NULL DEFAULT 'medium', "length" integer NOT NULL, "locale" character varying(16) NOT NULL DEFAULT 'es-419', CONSTRAINT "uq_word_category_text_locale" UNIQUE ("categoryId", "text", "locale"), CONSTRAINT "PK_ad026d65e30f80b7056ca31f666" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eb67d39df66989b021a85570d2" ON "word" ("locale") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_word_category_locale_difficulty" ON "word" ("categoryId", "locale", "difficulty") `,
    );
    await queryRunner.query(
      `CREATE TABLE "player" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sessionId" uuid NOT NULL, "name" character varying(20) NOT NULL, "isHost" boolean NOT NULL DEFAULT false, "joinedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "uq_player_session_name" UNIQUE ("sessionId", "name"), CONSTRAINT "PK_65edadc946a7faf4b638d5e8885" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6aca7c561753fc5148d8ef5d70" ON "player" ("sessionId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."game_session_status_enum" AS ENUM('LOBBY', 'IN_PROGRESS', 'ROUND_ENDED', 'FINISHED', 'ABANDONED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "game_session" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(6) NOT NULL, "hostPlayerId" uuid NOT NULL, "categorySlug" character varying(32) NOT NULL, "locale" character varying(16) NOT NULL DEFAULT 'es-419', "totalRounds" integer NOT NULL, "currentRound" integer NOT NULL DEFAULT '0', "status" "public"."game_session_status_enum" NOT NULL DEFAULT 'LOBBY', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "finishedAt" TIMESTAMP WITH TIME ZONE, "winnerPlayerId" uuid, CONSTRAINT "PK_58b630233711ccafbb0b2a904fc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_37864fb0926b4e6272475be92a" ON "game_session" ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "round_result" ("roundId" uuid NOT NULL, "playerId" uuid NOT NULL, "livesRemaining" integer NOT NULL, "lettersGuessed" character varying(64) NOT NULL, "solved" boolean NOT NULL DEFAULT false, "solvedAtMs" bigint, CONSTRAINT "PK_99df2c20259be5c50778fa8f0a3" PRIMARY KEY ("roundId", "playerId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_round_result_player" ON "round_result" ("playerId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "round" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sessionId" uuid NOT NULL, "roundNumber" integer NOT NULL, "wordText" character varying(64) NOT NULL, "wordDisplay" character varying(64) NOT NULL, "categorySlug" character varying(32) NOT NULL, "winnerPlayerId" uuid, "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "endedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "uq_round_session_number" UNIQUE ("sessionId", "roundNumber"), CONSTRAINT "PK_34bd959f3f4a90eb86e4ae24d2d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1736129cb8b7b3b8bc156d4490" ON "round" ("sessionId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "word" ADD CONSTRAINT "FK_102b2569c8611b68aafeee7d26e" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player" ADD CONSTRAINT "FK_6aca7c561753fc5148d8ef5d703" FOREIGN KEY ("sessionId") REFERENCES "game_session"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "round_result" ADD CONSTRAINT "FK_4a856e6771a0a08cde4b2949f53" FOREIGN KEY ("roundId") REFERENCES "round"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "round" ADD CONSTRAINT "FK_1736129cb8b7b3b8bc156d44904" FOREIGN KEY ("sessionId") REFERENCES "game_session"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "round" DROP CONSTRAINT "FK_1736129cb8b7b3b8bc156d44904"`,
    );
    await queryRunner.query(
      `ALTER TABLE "round_result" DROP CONSTRAINT "FK_4a856e6771a0a08cde4b2949f53"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player" DROP CONSTRAINT "FK_6aca7c561753fc5148d8ef5d703"`,
    );
    await queryRunner.query(
      `ALTER TABLE "word" DROP CONSTRAINT "FK_102b2569c8611b68aafeee7d26e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1736129cb8b7b3b8bc156d4490"`,
    );
    await queryRunner.query(`DROP TABLE "round"`);
    await queryRunner.query(`DROP INDEX "public"."idx_round_result_player"`);
    await queryRunner.query(`DROP TABLE "round_result"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_37864fb0926b4e6272475be92a"`,
    );
    await queryRunner.query(`DROP TABLE "game_session"`);
    await queryRunner.query(`DROP TYPE "public"."game_session_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6aca7c561753fc5148d8ef5d70"`,
    );
    await queryRunner.query(`DROP TABLE "player"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_word_category_locale_difficulty"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eb67d39df66989b021a85570d2"`,
    );
    await queryRunner.query(`DROP TABLE "word"`);
    await queryRunner.query(`DROP TYPE "public"."word_difficulty_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_76480e1b84bc1c58d8af6502d7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cb73208f151aa71cdd78f662d7"`,
    );
    await queryRunner.query(`DROP TABLE "category"`);
  }
}
