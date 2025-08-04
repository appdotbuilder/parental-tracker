
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, devicesTable } from '../db/schema';
import { getUserDevices } from '../handlers/get_user_devices';

describe('getUserDevices', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return devices for a user', async () => {
    // Create a test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'parent@test.com',
        password_hash: 'hashedpassword',
        role: 'parent',
        full_name: 'Test Parent'
      })
      .returning()
      .execute();

    // Create test devices for the user
    await db.insert(devicesTable)
      .values([
        {
          user_id: user.id,
          device_name: 'iPhone 13',
          device_type: 'ios',
          device_id: 'device-001',
          is_active: true
        },
        {
          user_id: user.id,
          device_name: 'Samsung Galaxy',
          device_type: 'android',
          device_id: 'device-002',
          is_active: false
        }
      ])
      .execute();

    const result = await getUserDevices(user.id);

    expect(result).toHaveLength(2);
    expect(result[0].device_name).toEqual('iPhone 13');
    expect(result[0].device_type).toEqual('ios');
    expect(result[0].device_id).toEqual('device-001');
    expect(result[0].is_active).toBe(true);
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].created_at).toBeInstanceOf(Date);

    expect(result[1].device_name).toEqual('Samsung Galaxy');
    expect(result[1].device_type).toEqual('android');
    expect(result[1].device_id).toEqual('device-002');
    expect(result[1].is_active).toBe(false);
    expect(result[1].user_id).toEqual(user.id);
  });

  it('should return empty array for user with no devices', async () => {
    // Create a test user without devices
    const [user] = await db.insert(usersTable)
      .values({
        email: 'parent@test.com',
        password_hash: 'hashedpassword',
        role: 'parent',
        full_name: 'Test Parent'
      })
      .returning()
      .execute();

    const result = await getUserDevices(user.id);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array for non-existent user', async () => {
    const result = await getUserDevices(999);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should only return devices for the specified user', async () => {
    // Create two test users
    const [user1] = await db.insert(usersTable)
      .values({
        email: 'parent1@test.com',
        password_hash: 'hashedpassword',
        role: 'parent',
        full_name: 'Test Parent 1'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        email: 'parent2@test.com',
        password_hash: 'hashedpassword',
        role: 'parent',
        full_name: 'Test Parent 2'
      })
      .returning()
      .execute();

    // Create devices for both users
    await db.insert(devicesTable)
      .values([
        {
          user_id: user1.id,
          device_name: 'User1 Device',
          device_type: 'ios',
          device_id: 'device-user1',
          is_active: true
        },
        {
          user_id: user2.id,
          device_name: 'User2 Device',
          device_type: 'android',
          device_id: 'device-user2',
          is_active: true
        }
      ])
      .execute();

    const result = await getUserDevices(user1.id);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user1.id);
    expect(result[0].device_name).toEqual('User1 Device');
    expect(result[0].device_id).toEqual('device-user1');
  });
});
