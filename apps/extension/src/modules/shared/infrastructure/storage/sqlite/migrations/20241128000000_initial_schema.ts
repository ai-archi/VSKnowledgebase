import type { Knex } from 'knex';

/**
 * 初始数据库结构迁移
 * 创建 artifact_metadata_index 和 artifact_links 表及其索引
 */
export async function up(knex: Knex): Promise<void> {
  // 创建元数据索引表（使用 IF NOT EXISTS 保证幂等性）
  const tableExists = await knex.schema.hasTable('artifact_metadata_index');
  if (!tableExists) {
    await knex.schema.createTable('artifact_metadata_index', (table) => {
      table.string('id').primary();
      table.string('artifact_id').notNullable();
      table.string('vault_id').notNullable();
      table.string('vault_name').notNullable();
      table.string('type');
      table.string('category');
      table.text('tags'); // SQLite 使用 TEXT 存储 JSON
      table.text('links'); // 文档内链接（wikilinks, refs, external）
      table.text('relationships'); // 完整的关联关系列表（替代独立的 artifact_links 表）
      table.text('related_artifacts'); // 向后兼容：简化的关联 Artifact ID 列表
      table.text('related_code_paths'); // 向后兼容：简化的代码路径列表
      table.text('related_components');
      table.string('author');
      table.string('owner');
      table.text('reviewers');
      table.text('properties');
      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').notNullable();
      table.string('metadata_file_path').notNullable();
      table.string('title'); // 用于 FTS5 搜索
      table.text('description'); // 用于 FTS5 搜索
    });
  }

  // 创建 artifact_metadata_index 表的索引
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS artifact_metadata_index_artifact_id_index ON artifact_metadata_index (artifact_id)`
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS artifact_metadata_index_vault_id_index ON artifact_metadata_index (vault_id)`
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS artifact_metadata_index_type_index ON artifact_metadata_index (type)`
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS artifact_metadata_index_category_index ON artifact_metadata_index (category)`
  );

  // 创建链接索引表（使用 IF NOT EXISTS 保证幂等性）
  const linksTableExists = await knex.schema.hasTable('artifact_links');
  if (!linksTableExists) {
    await knex.schema.createTable('artifact_links', (table) => {
      table.string('id').primary();
      table.string('source_artifact_id').notNullable();
      table.string('target_type').notNullable();
      table.string('target_id');
      table.string('target_path');
      table.string('target_url');
      table.string('link_type').notNullable();
      table.string('description');
      table.string('strength');
      table.text('code_location'); // SQLite 使用 TEXT 存储 JSON
      table.string('vault_id').notNullable();
      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').notNullable();
    });
  }

  // 创建 artifact_links 表的索引
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS artifact_links_source_artifact_id_index ON artifact_links (source_artifact_id)`
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS artifact_links_target_path_index ON artifact_links (target_path)`
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS artifact_links_link_type_index ON artifact_links (link_type)`
  );
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS artifact_links_vault_id_index ON artifact_links (vault_id)`
  );
}

export async function down(knex: Knex): Promise<void> {
  // 删除索引
  await knex.raw(`DROP INDEX IF EXISTS artifact_links_vault_id_index`);
  await knex.raw(`DROP INDEX IF EXISTS artifact_links_link_type_index`);
  await knex.raw(`DROP INDEX IF EXISTS artifact_links_target_path_index`);
  await knex.raw(`DROP INDEX IF EXISTS artifact_links_source_artifact_id_index`);
  
  await knex.raw(`DROP INDEX IF EXISTS artifact_metadata_index_category_index`);
  await knex.raw(`DROP INDEX IF EXISTS artifact_metadata_index_type_index`);
  await knex.raw(`DROP INDEX IF EXISTS artifact_metadata_index_vault_id_index`);
  await knex.raw(`DROP INDEX IF EXISTS artifact_metadata_index_artifact_id_index`);

  // 删除表
  await knex.schema.dropTableIfExists('artifact_links');
  await knex.schema.dropTableIfExists('artifact_metadata_index');
}

