
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const loginUser = async (input: LoginInput): Promise<User> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // In a real implementation, you would verify the password hash here
    // For this implementation, we'll do a simple comparison
    // Note: In production, use bcrypt or similar to hash and compare passwords
    if (user.password_hash !== input.password) {
      throw new Error('Invalid email or password');
    }

    return user;
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
};
