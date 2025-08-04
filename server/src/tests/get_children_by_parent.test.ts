
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, familyRelationshipsTable } from '../db/schema';
import { type CreateUserInput, type CreateFamilyRelationshipInput } from '../schema';
import { getChildrenByParent } from '../handlers/get_children_by_parent';
import { eq } from 'drizzle-orm';

// Test data
const testParent: CreateUserInput = {
  email: 'parent@test.com',
  password: 'password123',
  role: 'parent',
  full_name: 'Test Parent'
};

const testChild1: CreateUserInput = {
  email: 'child1@test.com',
  password: 'password123',
  role: 'child',
  full_name: 'Test Child 1'
};

const testChild2: CreateUserInput = {
  email: 'child2@test.com',
  password: 'password123',
  role: 'child',
  full_name: 'Test Child 2'
};

const otherParent: CreateUserInput = {
  email: 'other@test.com',
  password: 'password123',
  role: 'parent',
  full_name: 'Other Parent'
};

const otherChild: CreateUserInput = {
  email: 'other-child@test.com',
  password: 'password123',
  role: 'child',
  full_name: 'Other Child'
};

describe('getChildrenByParent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when parent has no children', async () => {
    // Create parent but no family relationships
    const parentResult = await db.insert(usersTable)
      .values({
        email: testParent.email,
        password_hash: 'hashed_password',
        role: testParent.role,
        full_name: testParent.full_name
      })
      .returning()
      .execute();

    const result = await getChildrenByParent(parentResult[0].id);

    expect(result).toEqual([]);
  });

  it('should return all children for a parent', async () => {
    // Create parent
    const parentResult = await db.insert(usersTable)
      .values({
        email: testParent.email,
        password_hash: 'hashed_password',
        role: testParent.role,
        full_name: testParent.full_name
      })
      .returning()
      .execute();

    // Create children
    const child1Result = await db.insert(usersTable)
      .values({
        email: testChild1.email,
        password_hash: 'hashed_password',
        role: testChild1.role,
        full_name: testChild1.full_name
      })
      .returning()
      .execute();

    const child2Result = await db.insert(usersTable)
      .values({
        email: testChild2.email,
        password_hash: 'hashed_password',
        role: testChild2.role,
        full_name: testChild2.full_name
      })
      .returning()
      .execute();

    // Create family relationships
    await db.insert(familyRelationshipsTable)
      .values([
        {
          parent_id: parentResult[0].id,
          child_id: child1Result[0].id
        },
        {
          parent_id: parentResult[0].id,
          child_id: child2Result[0].id
        }
      ])
      .execute();

    const result = await getChildrenByParent(parentResult[0].id);

    expect(result).toHaveLength(2);
    
    // Check that both children are returned
    const childEmails = result.map(child => child.email).sort();
    expect(childEmails).toEqual(['child1@test.com', 'child2@test.com']);
    
    // Verify user structure
    result.forEach(child => {
      expect(child.id).toBeDefined();
      expect(child.email).toBeDefined();
      expect(child.password_hash).toBeDefined();
      expect(child.role).toEqual('child');
      expect(child.full_name).toBeDefined();
      expect(child.created_at).toBeInstanceOf(Date);
      expect(child.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should only return children for the specified parent', async () => {
    // Create two parents
    const parent1Result = await db.insert(usersTable)
      .values({
        email: testParent.email,
        password_hash: 'hashed_password',
        role: testParent.role,
        full_name: testParent.full_name
      })
      .returning()
      .execute();

    const parent2Result = await db.insert(usersTable)
      .values({
        email: otherParent.email,
        password_hash: 'hashed_password',
        role: otherParent.role,
        full_name: otherParent.full_name
      })
      .returning()
      .execute();

    // Create children
    const child1Result = await db.insert(usersTable)
      .values({
        email: testChild1.email,
        password_hash: 'hashed_password',
        role: testChild1.role,
        full_name: testChild1.full_name
      })
      .returning()
      .execute();

    const otherChildResult = await db.insert(usersTable)
      .values({
        email: otherChild.email,
        password_hash: 'hashed_password',
        role: otherChild.role,
        full_name: otherChild.full_name
      })
      .returning()
      .execute();

    // Create family relationships - each parent has one child
    await db.insert(familyRelationshipsTable)
      .values([
        {
          parent_id: parent1Result[0].id,
          child_id: child1Result[0].id
        },
        {
          parent_id: parent2Result[0].id,
          child_id: otherChildResult[0].id
        }
      ])
      .execute();

    // Get children for first parent only
    const result = await getChildrenByParent(parent1Result[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].email).toEqual('child1@test.com');
    expect(result[0].full_name).toEqual('Test Child 1');
  });

  it('should handle non-existent parent ID', async () => {
    const result = await getChildrenByParent(999);

    expect(result).toEqual([]);
  });

  it('should verify data is saved correctly in database', async () => {
    // Create parent and child
    const parentResult = await db.insert(usersTable)
      .values({
        email: testParent.email,
        password_hash: 'hashed_password',
        role: testParent.role,
        full_name: testParent.full_name
      })
      .returning()
      .execute();

    const childResult = await db.insert(usersTable)
      .values({
        email: testChild1.email,
        password_hash: 'hashed_password',
        role: testChild1.role,
        full_name: testChild1.full_name
      })
      .returning()
      .execute();

    // Create relationship
    await db.insert(familyRelationshipsTable)
      .values({
        parent_id: parentResult[0].id,
        child_id: childResult[0].id
      })
      .execute();

    // Verify relationship exists in database
    const relationships = await db.select()
      .from(familyRelationshipsTable)
      .where(eq(familyRelationshipsTable.parent_id, parentResult[0].id))
      .execute();

    expect(relationships).toHaveLength(1);
    expect(relationships[0].parent_id).toEqual(parentResult[0].id);
    expect(relationships[0].child_id).toEqual(childResult[0].id);
    expect(relationships[0].created_at).toBeInstanceOf(Date);

    // Test the handler
    const result = await getChildrenByParent(parentResult[0].id);
    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(childResult[0].id);
  });
});
