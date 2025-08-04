
import { db } from '../db';
import { familyRelationshipsTable, usersTable } from '../db/schema';
import { type CreateFamilyRelationshipInput, type FamilyRelationship } from '../schema';
import { eq } from 'drizzle-orm';

export const createFamilyRelationship = async (input: CreateFamilyRelationshipInput): Promise<FamilyRelationship> => {
  try {
    // Verify parent exists and has parent role
    const parent = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.parent_id))
      .execute();

    if (parent.length === 0) {
      throw new Error('Parent user not found');
    }

    if (parent[0].role !== 'parent') {
      throw new Error('User must have parent role');
    }

    // Verify child exists and has child role
    const child = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.child_id))
      .execute();

    if (child.length === 0) {
      throw new Error('Child user not found');
    }

    if (child[0].role !== 'child') {
      throw new Error('User must have child role');
    }

    // Insert family relationship record
    const result = await db.insert(familyRelationshipsTable)
      .values({
        parent_id: input.parent_id,
        child_id: input.child_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Family relationship creation failed:', error);
    throw error;
  }
};
