
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

const testParentInput: CreateUserInput = {
  email: 'parent@example.com',
  password: 'password123',
  role: 'parent',
  full_name: 'John Doe'
};

const testChildInput: CreateUserInput = {
  email: 'child@example.com',
  password: 'password456',
  role: 'child',
  full_name: 'Jane Doe'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a parent user', async () => {
    const result = await createUser(testParentInput);

    expect(result.email).toEqual('parent@example.com');
    expect(result.role).toEqual('parent');
    expect(result.full_name).toEqual('John Doe');
    expect(result.password_hash).toEqual('hashed_password123');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a child user', async () => {
    const result = await createUser(testChildInput);

    expect(result.email).toEqual('child@example.com');
    expect(result.role).toEqual('child');
    expect(result.full_name).toEqual('Jane Doe');
    expect(result.password_hash).toEqual('hashed_password456');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testParentInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('parent@example.com');
    expect(users[0].role).toEqual('parent');
    expect(users[0].full_name).toEqual('John Doe');
    expect(users[0].password_hash).toEqual('hashed_password123');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for duplicate email', async () => {
    await createUser(testParentInput);

    await expect(createUser(testParentInput)).rejects.toThrow(/duplicate key value/i);
  });

  it('should create multiple users with different emails', async () => {
    const parent = await createUser(testParentInput);
    const child = await createUser(testChildInput);

    expect(parent.id).not.toEqual(child.id);
    expect(parent.email).toEqual('parent@example.com');
    expect(child.email).toEqual('child@example.com');
    expect(parent.role).toEqual('parent');
    expect(child.role).toEqual('child');
  });
});
