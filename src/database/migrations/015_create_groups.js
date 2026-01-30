import { v4 as uuidv4 } from 'uuid';

/**
 * Create groups, group_members, and system_settings tables.
 * Migrate existing data: first admin becomes super_admin,
 * create a Default group, assign existing users.
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // Create system_settings table
  await knex.schema.createTable('system_settings', (table) => {
    table.string('id', 36).primary();
    table.string('key', 100).unique().notNullable();
    table.text('value');
    table.string('updated_by', 36).references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
  });

  // Create groups table
  await knex.schema.createTable('groups', (table) => {
    table.string('id', 36).primary();
    table.string('name', 100).notNullable();
    table.string('description', 500);
    table.boolean('is_active').defaultTo(true);
    table.string('created_by', 36).references('id').inTable('users').onDelete('RESTRICT');
    table.timestamps(true, true);
    table.index('name');
    table.index('is_active');
  });

  // Create group_members table
  await knex.schema.createTable('group_members', (table) => {
    table.string('id', 36).primary();
    table.string('group_id', 36).notNullable().references('id').inTable('groups').onDelete('CASCADE');
    table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('role', 20).notNullable().defaultTo('member');
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    table.unique(['group_id', 'user_id']);
    table.index('user_id');
    table.index('group_id');
    table.index(['user_id', 'role']);
  });

  // Insert default system settings
  await knex('system_settings').insert([
    {
      id: uuidv4(),
      key: 'allow_public_registration',
      value: 'false',
    },
    {
      id: uuidv4(),
      key: 'default_registration_group_id',
      value: null,
    },
  ]);

  // Migrate existing data
  // 1. First admin user becomes super_admin
  const firstAdmin = await knex('users')
    .where('role', 'admin')
    .orderBy('created_at', 'asc')
    .first();

  if (firstAdmin) {
    await knex('users')
      .where('id', firstAdmin.id)
      .update({ role: 'super_admin' });
  }

  // 2. Create a Default group
  const allUsers = await knex('users').select('id', 'role');
  if (allUsers.length > 0) {
    const defaultGroupId = uuidv4();
    const createdBy = firstAdmin ? firstAdmin.id : allUsers[0].id;

    await knex('groups').insert({
      id: defaultGroupId,
      name: 'Default',
      description: 'Default group for all users',
      is_active: true,
      created_by: createdBy,
    });

    // 3. Assign all non-super_admin users to the Default group
    const members = [];
    for (const user of allUsers) {
      // Skip the user we just promoted to super_admin
      if (firstAdmin && user.id === firstAdmin.id) continue;

      const memberRole = user.role === 'admin' ? 'admin' : 'member';
      members.push({
        id: uuidv4(),
        group_id: defaultGroupId,
        user_id: user.id,
        role: memberRole,
      });
    }

    if (members.length > 0) {
      await knex('group_members').insert(members);
    }

    // Update system setting for default registration group
    await knex('system_settings')
      .where('key', 'default_registration_group_id')
      .update({ value: defaultGroupId });
  }
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  // Revert super_admin back to admin
  await knex('users')
    .where('role', 'super_admin')
    .update({ role: 'admin' });

  await knex.schema.dropTableIfExists('group_members');
  await knex.schema.dropTableIfExists('groups');
  await knex.schema.dropTableIfExists('system_settings');
}
