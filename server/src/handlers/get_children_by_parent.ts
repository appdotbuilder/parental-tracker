
import { db } from '../db';
import { usersTable, familyRelationshipsTable } from '../db/schema';
import { type User } from '../schema';
import { eq } from 'drizzle-orm';

export const getChildrenByParent = async (parentId: number): Promise<User[]> => {
  try {
    // Join family relationships with users to get child user details
    const results = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      password_hash: usersTable.password_hash,
      role: usersTable.role,
      full_name: usersTable.full_name,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
      .from(familyRelationshipsTable)
      .innerJoin(usersTable, eq(familyRelationshipsTable.child_id, usersTable.id))
      .where(eq(familyRelationshipsTable.parent_id, parentId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get children by parent:', error);
    throw error;
  }
};
