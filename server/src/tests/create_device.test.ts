
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { devicesTable, usersTable } from '../db/schema';
import { type CreateDeviceInput } from '../schema';
import { createDevice } from '../handlers/create_device';
import { eq } from 'drizzle-orm';

describe('createDevice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create a test user first since device requires a valid user_id
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'parent',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should create a device', async () => {
    const user = await createTestUser();
    
    const testInput: CreateDeviceInput = {
      user_id: user.id,
      device_name: 'Test iPhone',
      device_type: 'ios',
      device_id: 'unique-device-123'
    };

    const result = await createDevice(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(user.id);
    expect(result.device_name).toEqual('Test iPhone');
    expect(result.device_type).toEqual('ios');
    expect(result.device_id).toEqual('unique-device-123');
    expect(result.is_active).toEqual(true);
    expect(result.last_seen).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save device to database', async () => {
    const user = await createTestUser();
    
    const testInput: CreateDeviceInput = {
      user_id: user.id,
      device_name: 'Android Phone',
      device_type: 'android',
      device_id: 'android-device-456'
    };

    const result = await createDevice(testInput);

    // Query using proper drizzle syntax
    const devices = await db.select()
      .from(devicesTable)
      .where(eq(devicesTable.id, result.id))
      .execute();

    expect(devices).toHaveLength(1);
    expect(devices[0].user_id).toEqual(user.id);
    expect(devices[0].device_name).toEqual('Android Phone');
    expect(devices[0].device_type).toEqual('android');
    expect(devices[0].device_id).toEqual('android-device-456');
    expect(devices[0].is_active).toEqual(true);
    expect(devices[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle unique device_id constraint', async () => {
    const user = await createTestUser();
    
    const testInput: CreateDeviceInput = {
      user_id: user.id,
      device_name: 'First Device',
      device_type: 'ios',
      device_id: 'duplicate-device-id'
    };

    // Create first device
    await createDevice(testInput);

    // Try to create second device with same device_id
    const duplicateInput: CreateDeviceInput = {
      user_id: user.id,
      device_name: 'Second Device',
      device_type: 'android',
      device_id: 'duplicate-device-id'
    };

    await expect(createDevice(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should validate foreign key constraint for user_id', async () => {
    const testInput: CreateDeviceInput = {
      user_id: 999, // Non-existent user ID
      device_name: 'Test Device',
      device_type: 'ios',
      device_id: 'test-device-789'
    };

    await expect(createDevice(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});
