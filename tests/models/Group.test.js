/**
 * Group model tests
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import {
  setupTestDb,
  closeTestDb,
  resetTestDb,
  getTestDb,
  createTestUser,
} from '../setup.js'

// Mock the database connection module
vi.mock('../../src/database/connection.js', async () => {
  const setup = await vi.importActual('../setup.js')
  const knexInstance = await setup.setupTestDb()

  return {
    default: knexInstance,
    knex: knexInstance,
    initDatabase: async () => knexInstance,
    closeDatabase: async () => {},
    transaction: async (fn) => knexInstance.transaction(fn),
  }
})

// Import after mocking
const { Group } = await import('../../src/models/Group.js')

beforeAll(async () => {
  await setupTestDb()
})

afterAll(async () => {
  await closeTestDb()
})

beforeEach(async () => {
  await resetTestDb()
})

describe('Group', () => {
  describe('create', () => {
    it('should create a new group', async () => {
      await createTestUser('user-1')
      const group = await Group.create({
        name: 'Test Group',
        description: 'A test group',
        createdBy: 'user-1',
      })

      expect(group).toBeDefined()
      expect(group.name).toBe('Test Group')
      expect(group.description).toBe('A test group')
      expect(group.isActive).toBe(true)
      expect(group.createdBy).toBe('user-1')
    })

    it('should create a group without description', async () => {
      await createTestUser('user-1')
      const group = await Group.create({
        name: 'No Desc Group',
        createdBy: 'user-1',
      })

      expect(group.name).toBe('No Desc Group')
      expect(group.description).toBeNull()
    })
  })

  describe('findById', () => {
    it('should find group by ID', async () => {
      await createTestUser('user-1')
      const created = await Group.create({ name: 'Find Me', createdBy: 'user-1' })
      const found = await Group.findById(created.id)

      expect(found).toBeDefined()
      expect(found.name).toBe('Find Me')
    })

    it('should return null for non-existing ID', async () => {
      const found = await Group.findById('non-existing-id')
      expect(found).toBeNull()
    })
  })

  describe('findByIdOrFail', () => {
    it('should throw NotFoundError for non-existing ID', async () => {
      await expect(Group.findByIdOrFail('non-existing')).rejects.toThrow('Groupe non trouvé')
    })
  })

  describe('findAll', () => {
    it('should return paginated groups', async () => {
      await createTestUser('user-1')
      await Group.create({ name: 'Group A', createdBy: 'user-1' })
      await Group.create({ name: 'Group B', createdBy: 'user-1' })

      const result = await Group.findAll()
      expect(result.data).toHaveLength(2)
      expect(result.pagination.total).toBe(2)
    })

    it('should filter by active status', async () => {
      await createTestUser('user-1')
      const group = await Group.create({ name: 'Active', createdBy: 'user-1' })
      await Group.create({ name: 'To Deactivate', createdBy: 'user-1' })
      const toDeactivate = await Group.findAll()
      await Group.deactivate(toDeactivate.data.find(g => g.name === 'To Deactivate').id)

      const result = await Group.findAll({ isActive: true })
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Active')
    })

    it('should search by name', async () => {
      await createTestUser('user-1')
      await Group.create({ name: 'Finance Team', createdBy: 'user-1' })
      await Group.create({ name: 'HR Team', createdBy: 'user-1' })

      const result = await Group.findAll({ search: 'Finance' })
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Finance Team')
    })
  })

  describe('update', () => {
    it('should update group name and description', async () => {
      await createTestUser('user-1')
      const group = await Group.create({ name: 'Old Name', createdBy: 'user-1' })
      const updated = await Group.update(group.id, {
        name: 'New Name',
        description: 'New description',
      })

      expect(updated.name).toBe('New Name')
      expect(updated.description).toBe('New description')
    })
  })

  describe('deactivate', () => {
    it('should set is_active to false', async () => {
      await createTestUser('user-1')
      const group = await Group.create({ name: 'Active Group', createdBy: 'user-1' })
      const deactivated = await Group.deactivate(group.id)

      expect(deactivated.isActive).toBe(false)
    })
  })

  describe('addMember', () => {
    it('should add a member to a group', async () => {
      await createTestUser('user-1')
      await createTestUser('user-2', 'user2@test.com')
      const group = await Group.create({ name: 'My Group', createdBy: 'user-1' })

      const member = await Group.addMember(group.id, 'user-2', 'member')
      expect(member).toBeDefined()
      expect(member.userId).toBe('user-2')
      expect(member.role).toBe('member')
    })

    it('should reject duplicate membership', async () => {
      await createTestUser('user-1')
      await createTestUser('user-2', 'user2@test.com')
      const group = await Group.create({ name: 'My Group', createdBy: 'user-1' })
      await Group.addMember(group.id, 'user-2', 'member')

      await expect(Group.addMember(group.id, 'user-2', 'member'))
        .rejects.toThrow('Cet utilisateur est déjà membre de ce groupe')
    })

    it('should add admin member', async () => {
      await createTestUser('user-1')
      await createTestUser('user-2', 'user2@test.com')
      const group = await Group.create({ name: 'My Group', createdBy: 'user-1' })

      const member = await Group.addMember(group.id, 'user-2', 'admin')
      expect(member.role).toBe('admin')
    })
  })

  describe('removeMember', () => {
    it('should remove a member from a group', async () => {
      await createTestUser('user-1')
      await createTestUser('user-2', 'user2@test.com')
      const group = await Group.create({ name: 'My Group', createdBy: 'user-1' })
      await Group.addMember(group.id, 'user-2', 'member')

      await Group.removeMember(group.id, 'user-2')
      const isMember = await Group.isMember('user-2', group.id)
      expect(isMember).toBe(false)
    })

    it('should throw if member not found', async () => {
      await createTestUser('user-1')
      const group = await Group.create({ name: 'My Group', createdBy: 'user-1' })

      await expect(Group.removeMember(group.id, 'non-existing'))
        .rejects.toThrow('Membre non trouvé dans ce groupe')
    })
  })

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      await createTestUser('user-1')
      await createTestUser('user-2', 'user2@test.com')
      const group = await Group.create({ name: 'My Group', createdBy: 'user-1' })
      await Group.addMember(group.id, 'user-2', 'member')

      const updated = await Group.updateMemberRole(group.id, 'user-2', 'admin')
      expect(updated.role).toBe('admin')
    })

    it('should throw if member not found', async () => {
      await createTestUser('user-1')
      const group = await Group.create({ name: 'My Group', createdBy: 'user-1' })

      await expect(Group.updateMemberRole(group.id, 'non-existing', 'admin'))
        .rejects.toThrow('Membre non trouvé dans ce groupe')
    })
  })

  describe('findMembers', () => {
    it('should list members of a group', async () => {
      await createTestUser('user-1')
      await createTestUser('user-2', 'user2@test.com')
      await createTestUser('user-3', 'user3@test.com')
      const group = await Group.create({ name: 'My Group', createdBy: 'user-1' })
      await Group.addMember(group.id, 'user-2', 'member')
      await Group.addMember(group.id, 'user-3', 'admin')

      const result = await Group.findMembers(group.id)
      expect(result.data).toHaveLength(2)
      expect(result.pagination.total).toBe(2)
    })

    it('should filter members by role', async () => {
      await createTestUser('user-1')
      await createTestUser('user-2', 'user2@test.com')
      await createTestUser('user-3', 'user3@test.com')
      const group = await Group.create({ name: 'My Group', createdBy: 'user-1' })
      await Group.addMember(group.id, 'user-2', 'member')
      await Group.addMember(group.id, 'user-3', 'admin')

      const result = await Group.findMembers(group.id, { role: 'admin' })
      expect(result.data).toHaveLength(1)
      expect(result.data[0].role).toBe('admin')
    })
  })

  describe('findByUser', () => {
    it('should find groups for a user', async () => {
      await createTestUser('user-1')
      await createTestUser('user-2', 'user2@test.com')
      const group1 = await Group.create({ name: 'Group 1', createdBy: 'user-1' })
      const group2 = await Group.create({ name: 'Group 2', createdBy: 'user-1' })
      await Group.addMember(group1.id, 'user-2', 'member')
      await Group.addMember(group2.id, 'user-2', 'admin')

      const groups = await Group.findByUser('user-2')
      expect(groups).toHaveLength(2)
    })
  })

  describe('findByAdmin', () => {
    it('should find groups administered by a user', async () => {
      await createTestUser('user-1')
      await createTestUser('user-2', 'user2@test.com')
      const group1 = await Group.create({ name: 'Group 1', createdBy: 'user-1' })
      const group2 = await Group.create({ name: 'Group 2', createdBy: 'user-1' })
      await Group.addMember(group1.id, 'user-2', 'admin')
      await Group.addMember(group2.id, 'user-2', 'member')

      const groups = await Group.findByAdmin('user-2')
      expect(groups).toHaveLength(1)
      expect(groups[0].name).toBe('Group 1')
    })
  })

  describe('isGroupAdmin', () => {
    it('should return true when user is admin of group', async () => {
      await createTestUser('user-1')
      await createTestUser('user-2', 'user2@test.com')
      const group = await Group.create({ name: 'My Group', createdBy: 'user-1' })
      await Group.addMember(group.id, 'user-2', 'admin')

      const result = await Group.isGroupAdmin('user-2', group.id)
      expect(result).toBe(true)
    })

    it('should return false when user is member of group', async () => {
      await createTestUser('user-1')
      await createTestUser('user-2', 'user2@test.com')
      const group = await Group.create({ name: 'My Group', createdBy: 'user-1' })
      await Group.addMember(group.id, 'user-2', 'member')

      const result = await Group.isGroupAdmin('user-2', group.id)
      expect(result).toBe(false)
    })
  })

  describe('isMember', () => {
    it('should return true when user is in group', async () => {
      await createTestUser('user-1')
      await createTestUser('user-2', 'user2@test.com')
      const group = await Group.create({ name: 'My Group', createdBy: 'user-1' })
      await Group.addMember(group.id, 'user-2', 'member')

      const result = await Group.isMember('user-2', group.id)
      expect(result).toBe(true)
    })

    it('should return false when user is not in group', async () => {
      await createTestUser('user-1')
      const group = await Group.create({ name: 'My Group', createdBy: 'user-1' })

      const result = await Group.isMember('user-1', group.id)
      expect(result).toBe(false)
    })
  })

  describe('getMemberCount', () => {
    it('should return correct member count', async () => {
      await createTestUser('user-1')
      await createTestUser('user-2', 'user2@test.com')
      await createTestUser('user-3', 'user3@test.com')
      const group = await Group.create({ name: 'My Group', createdBy: 'user-1' })
      await Group.addMember(group.id, 'user-2', 'member')
      await Group.addMember(group.id, 'user-3', 'admin')

      const count = await Group.getMemberCount(group.id)
      expect(count).toBe(2)
    })

    it('should return 0 for empty group', async () => {
      await createTestUser('user-1')
      const group = await Group.create({ name: 'Empty Group', createdBy: 'user-1' })

      const count = await Group.getMemberCount(group.id)
      expect(count).toBe(0)
    })
  })

  describe('format', () => {
    it('should format group for API response', () => {
      const formatted = Group.format({
        id: 'g-1',
        name: 'Test',
        description: 'Desc',
        is_active: 1,
        created_by: 'u-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      })

      expect(formatted.isActive).toBe(true)
      expect(formatted.createdBy).toBe('u-1')
    })
  })

  describe('formatMember', () => {
    it('should format member for API response', () => {
      const formatted = Group.formatMember({
        id: 'm-1',
        group_id: 'g-1',
        user_id: 'u-1',
        role: 'admin',
        joined_at: '2026-01-01',
        email: 'test@test.com',
        first_name: 'Test',
        last_name: 'User',
        is_active: 1,
      })

      expect(formatted.groupId).toBe('g-1')
      expect(formatted.userId).toBe('u-1')
      expect(formatted.role).toBe('admin')
      expect(formatted.isActive).toBe(true)
    })
  })
})
