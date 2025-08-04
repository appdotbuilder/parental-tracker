
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, familyRelationshipsTable } from '../db/schema';
import { type CreateFamilyRelationshipInput } from '../schema';
import { createFamilyRelationship } from '../handlers/create_family_relationship';
import { eq } from 'drizzle-orm';

describe('createFamilyRelationship', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a family relationship', async () => {
    // Create parent user
    const parentResult = await db.insert(usersTable)
      .values({
        email: 'parent@test.com',
        password_hash: 'hashedpassword',
        role: 'parent',
        full_name: 'Test Parent'
      })
      .returning()
      .execute();

    // Create child user
    const childResult = await db.insert(usersTable)
      .values({
        email: 'child@test.com',
        password_hash: 'hashedpassword',
        role: 'child',
        full_name: 'Test Child'
      })
      .returning()
      .execute();

    const testInput: CreateFamilyRelationshipInput = {
      parent_id: parentResult[0].id,
      child_id: childResult[0].id
    };

    const result = await createFamilyRelationship(testInput);

    // Basic field validation
    expect(result.parent_id).toEqual(parentResult[0].id);
    expect(result.child_id).toEqual(childResult[0].id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save family relationship to database', async () => {
    // Create parent user
    const parentResult = await db.insert(usersTable)
      .values({
        email: 'parent@test.com',
        password_hash: 'hashedpassword',
        role: 'parent',
        full_name: 'Test Parent'
      })
      .returning()
      .execute();

    // Create child user
    const childResult = await db.insert(usersTable)
      .values({
        email: 'child@test.com',
        password_hash: 'hashedpassword',
        role: 'child',
        full_name: 'Test Child'
      })
      .returning()
      .execute();

    const testInput: CreateFamilyRelationshipInput = {
      parent_id: parentResult[0].id,
      child_id: childResult[0].id
    };

    const result = await createFamilyRelationship(testInput);

    // Query using proper drizzle syntax
    const relationships = await db.select()
      .from(familyRelationshipsTable)
      .where(eq(familyRelationshipsTable.id, result.id))
      .execute();

    expect(relationships).toHaveLength(1);
    expect(relationships[0].parent_id).toEqual(parentResult[0].id);
    expect(relationships[0].child_id).toEqual(childResult[0].id);
    expect(relationships[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when parent user does not exist', async () => {
    // Create child user only
    const childResult = await db.insert(usersTable)
      .values({
        email: 'child@test.com',
        password_hash: 'hashedpassword',
        role: 'child',
        full_name: 'Test Child'
      })
      .returning()
      .execute();

    const testInput: CreateFamilyRelationshipInput = {
      parent_id: 999, // Non-existent parent ID
      child_id: childResult[0].id
    };

    await expect(createFamilyRelationship(testInput)).rejects.toThrow(/parent user not found/i);
  });

  it('should throw error when child user does not exist', async () => {
    // Create parent user only
    const parentResult = await db.insert(usersTable)
      .values({
        email: 'parent@test.com',
        password_hash: 'hashedpassword',
        role: 'parent',
        full_name: 'Test Parent'
      })
      .returning()
      .execute();

    const testInput: CreateFamilyRelationshipInput = {
      parent_id: parentResult[0].id,
      child_id: 999 // Non-existent child ID
    };

    await expect(createFamilyRelationship(testInput)).rejects.toThrow(/child user not found/i);
  });

  it('should throw error when parent user does not have parent role', async () => {
    // Create user with child role instead of parent
    const parentResult = await db.insert(usersTable)
      .values({
        email: 'notparent@test.com',
        password_hash: 'hashedpassword',
        role: 'child', // Wrong role
        full_name: 'Not A Parent'
      })
      .returning()
      .execute();

    // Create child user
    const childResult = await db.insert(usersTable)
      .values({
        email: 'child@test.com',
        password_hash: 'hashedpassword',
        role: 'child',
        full_name: 'Test Child'
      })
      .returning()
      .execute();

    const testInput: CreateFamilyRelationshipInput = {
      parent_id: parentResult[0].id,
      child_id: childResult[0].id
    };

    await expect(createFamilyRelationship(testInput)).rejects.toThrow(/must have parent role/i);
  });

  it('should throw error when child user does not have child role', async () => {
    // Create parent user
    const parentResult = await db.insert(usersTable)
      .values({
        email: 'parent@test.com',
        password_hash: 'hashedpassword',
        role: 'parent',
        full_name: 'Test Parent'
      })
      .returning()
      .execute();

    // Create user with parent role instead of child
    const childResult = await db.insert(usersTable)
      .values({
        email: 'notchild@test.com',
        password_hash: 'hashedpassword',
        role: 'parent', // Wrong role
        full_name: 'Not A Child'
      })
      .returning()
      .execute();

    const testInput: CreateFamilyRelationshipInput = {
      parent_id: parentResult[0].id,
      child_id: childResult[0].id
    };

    await expect(createFamilyRelationship(testInput)).rejects.toThrow(/must have child role/i);
  });
});
