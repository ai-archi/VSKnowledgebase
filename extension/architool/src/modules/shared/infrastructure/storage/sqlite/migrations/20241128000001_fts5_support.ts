import type { Knex } from 'knex';

/**
 * FTS5 全文搜索支持迁移
 * 创建 FTS5 虚拟表和触发器
 */
export async function up(knex: Knex): Promise<void> {
  // 创建 FTS5 虚拟表
  await knex.raw(`
    CREATE VIRTUAL TABLE IF NOT EXISTS artifact_fts USING fts5(
      artifact_id UNINDEXED,
      title,
      description,
      content='artifact_metadata_index',
      content_rowid='rowid',
      tokenize='unicode61'
    )
  `);

  // 创建触发器保持 FTS5 表与主表同步
  await knex.raw(`
    CREATE TRIGGER IF NOT EXISTS artifact_fts_insert AFTER INSERT ON artifact_metadata_index BEGIN
      INSERT INTO artifact_fts(rowid, artifact_id, title, description) 
      VALUES (new.rowid, new.artifact_id, new.title, new.description);
    END
  `);

  await knex.raw(`
    CREATE TRIGGER IF NOT EXISTS artifact_fts_delete AFTER DELETE ON artifact_metadata_index BEGIN
      DELETE FROM artifact_fts WHERE rowid = old.rowid;
    END
  `);

  await knex.raw(`
    CREATE TRIGGER IF NOT EXISTS artifact_fts_update AFTER UPDATE ON artifact_metadata_index BEGIN
      DELETE FROM artifact_fts WHERE rowid = old.rowid;
      INSERT INTO artifact_fts(rowid, artifact_id, title, description) 
      VALUES (new.rowid, new.artifact_id, new.title, new.description);
    END
  `);
}

export async function down(knex: Knex): Promise<void> {
  // 删除触发器
  await knex.raw(`DROP TRIGGER IF EXISTS artifact_fts_update`);
  await knex.raw(`DROP TRIGGER IF EXISTS artifact_fts_delete`);
  await knex.raw(`DROP TRIGGER IF EXISTS artifact_fts_insert`);

  // 删除 FTS5 虚拟表
  await knex.raw(`DROP TABLE IF EXISTS artifact_fts`);
}

