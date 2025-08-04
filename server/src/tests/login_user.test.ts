
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type CreateUserInput } from '../schema';
import { loginUser } from '../handlers/login_user';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  role: 'parent',
  full_name: 'Test User'
};

const loginInput: LoginInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login user with correct credentials', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: testUser.password, // In real app, this would be hashed
        role: testUser.role,
        full_name: testUser.full_name
      })
      .execute();

    const result = await loginUser(loginInput);

    // Verify user data
    expect(result.email).toEqual(testUser.email);
    expect(result.role).toEqual(testUser.role);
    expect(result.full_name).toEqual(testUser.full_name);
    expect(result.password_hash).toEqual(testUser.password);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent email', async () => {
    const invalidLogin: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    await expect(loginUser(invalidLogin)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for incorrect password', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: testUser.password,
        role: testUser.role,
        full_name: testUser.full_name
      })
      .execute();

    const invalidLogin: LoginInput = {
      email: testUser.email,
      password: 'wrongpassword'
    };

    await expect(loginUser(invalidLogin)).rejects.toThrow(/invalid email or password/i);
  });

  it('should work with child role users', async () => {
    const childUser: CreateUserInput = {
      email: 'child@example.com',
      password: 'childpass123',
      role: 'child',
      full_name: 'Child User'
    };

    // Create child user
    await db.insert(usersTable)
      .values({
        email: childUser.email,
        password_hash: childUser.password,
        role: childUser.role,
        full_name: childUser.full_name
      })
      .execute();

    const childLogin: LoginInput = {
      email: childUser.email,
      password: childUser.password
    };

    const result = await loginUser(childLogin);

    expect(result.email).toEqual(childUser.email);
    expect(result.role).toEqual('child');
    expect(result.full_name).toEqual(childUser.full_name);
  });

  it('should verify user exists in database after login', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: testUser.password,
        role: testUser.role,
        full_name: testUser.full_name
      })
      .execute();

    const result = await loginUser(loginInput);

    // Verify user exists in database with correct data
    const dbUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(dbUsers).toHaveLength(1);
    expect(dbUsers[0].email).toEqual(testUser.email);
    expect(dbUsers[0].role).toEqual(testUser.role);
    expect(dbUsers[0].full_name).toEqual(testUser.full_name);
  });

  it('should handle case-sensitive email comparison', async () => {
    // Create test user with lowercase email
    await db.insert(usersTable)
      .values({
        email: testUser.email.toLowerCase(),
        password_hash: testUser.password,
        role: testUser.role,
        full_name: testUser.full_name
      })
      .execute();

    // Try to login with uppercase email
    const uppercaseLogin: LoginInput = {
      email: testUser.email.toUpperCase(),
      password: testUser.password
    };

    // Should fail because emails don't match exactly
    await expect(loginUser(uppercaseLogin)).rejects.toThrow(/invalid email or password/i);
  });
});
