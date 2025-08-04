
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, devicesTable, appUsageTable } from '../db/schema';
import { type CreateAppUsageInput } from '../schema';
import { logAppUsage } from '../handlers/log_app_usage';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  email: 'child@test.com',
  password_hash: 'hashed_password',
  role: 'child' as const,
  full_name: 'Test Child'
};

const testDevice = {
  device_name: 'Test Phone',
  device_type: 'android' as const,
  device_id: 'device_123'
};

const testAppUsage: CreateAppUsageInput = {
  device_id: 1,
  app_name: 'Instagram',
  package_name: 'com.instagram.android',
  usage_duration: 3600, // 1 hour in seconds
  start_time: new Date('2024-01-15T14:00:00Z')
};

const testAppUsageWithEndTime: CreateAppUsageInput = {
  device_id: 1,
  app_name: 'YouTube',
  package_name: 'com.google.android.youtube',
  usage_duration: 1800, // 30 minutes in seconds
  start_time: new Date('2024-01-15T15:00:00Z'),
  end_time: new Date('2024-01-15T15:30:00Z')
};

describe('logAppUsage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should log app usage without end_time', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create prerequisite device
    await db.insert(devicesTable)
      .values({
        ...testDevice,
        user_id: userResult[0].id
      })
      .execute();

    const result = await logAppUsage(testAppUsage);

    // Verify basic fields
    expect(result.device_id).toEqual(1);
    expect(result.app_name).toEqual('Instagram');
    expect(result.package_name).toEqual('com.instagram.android');
    expect(result.usage_duration).toEqual(3600);
    expect(result.start_time).toBeInstanceOf(Date);
    expect(result.start_time.toISOString()).toEqual('2024-01-15T14:00:00.000Z');
    expect(result.end_time).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should log app usage with end_time', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create prerequisite device
    await db.insert(devicesTable)
      .values({
        ...testDevice,
        user_id: userResult[0].id
      })
      .execute();

    const result = await logAppUsage(testAppUsageWithEndTime);

    // Verify all fields including end_time
    expect(result.device_id).toEqual(1);
    expect(result.app_name).toEqual('YouTube');
    expect(result.package_name).toEqual('com.google.android.youtube');
    expect(result.usage_duration).toEqual(1800);
    expect(result.start_time).toBeInstanceOf(Date);
    expect(result.start_time.toISOString()).toEqual('2024-01-15T15:00:00.000Z');
    expect(result.end_time).toBeInstanceOf(Date);
    expect(result.end_time?.toISOString()).toEqual('2024-01-15T15:30:00.000Z');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save app usage data to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create prerequisite device
    await db.insert(devicesTable)
      .values({
        ...testDevice,
        user_id: userResult[0].id
      })
      .execute();

    const result = await logAppUsage(testAppUsage);

    // Query database to verify data was saved
    const appUsageRecords = await db.select()
      .from(appUsageTable)
      .where(eq(appUsageTable.id, result.id))
      .execute();

    expect(appUsageRecords).toHaveLength(1);
    const savedRecord = appUsageRecords[0];
    expect(savedRecord.device_id).toEqual(1);
    expect(savedRecord.app_name).toEqual('Instagram');
    expect(savedRecord.package_name).toEqual('com.instagram.android');
    expect(savedRecord.usage_duration).toEqual(3600);
    expect(savedRecord.start_time).toBeInstanceOf(Date);
    expect(savedRecord.end_time).toBeNull();
    expect(savedRecord.created_at).toBeInstanceOf(Date);
  });

  it('should handle multiple app usage logs for same device', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create prerequisite device
    await db.insert(devicesTable)
      .values({
        ...testDevice,
        user_id: userResult[0].id
      })
      .execute();

    // Log multiple app usage entries
    const result1 = await logAppUsage(testAppUsage);
    const result2 = await logAppUsage(testAppUsageWithEndTime);

    // Verify both records were created with different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.device_id).toEqual(result2.device_id);

    // Query database to verify both records exist
    const allRecords = await db.select()
      .from(appUsageTable)
      .execute();

    expect(allRecords).toHaveLength(2);
    
    const apps = allRecords.map(record => record.app_name).sort();
    expect(apps).toEqual(['Instagram', 'YouTube']);
  });

  it('should throw error for non-existent device', async () => {
    // Don't create any prerequisite data
    const invalidInput = {
      ...testAppUsage,
      device_id: 999 // Non-existent device
    };

    await expect(logAppUsage(invalidInput)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should handle zero usage duration correctly', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create prerequisite device
    await db.insert(devicesTable)
      .values({
        ...testDevice,
        user_id: userResult[0].id
      })
      .execute();

    const zeroUsageInput: CreateAppUsageInput = {
      device_id: 1,
      app_name: 'Quick App',
      package_name: 'com.quick.app',
      usage_duration: 0,
      start_time: new Date('2024-01-15T16:00:00Z')
    };

    const result = await logAppUsage(zeroUsageInput);

    expect(result.usage_duration).toEqual(0);
    expect(result.app_name).toEqual('Quick App');
  });

  it('should handle long app names and package names', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create prerequisite device
    await db.insert(devicesTable)
      .values({
        ...testDevice,
        user_id: userResult[0].id
      })
      .execute();

    const longNameInput: CreateAppUsageInput = {
      device_id: 1,
      app_name: 'Very Long Application Name That Contains Many Words And Characters',
      package_name: 'com.very.long.package.name.that.contains.many.segments.and.characters',
      usage_duration: 2400,
      start_time: new Date('2024-01-15T17:00:00Z')
    };

    const result = await logAppUsage(longNameInput);

    expect(result.app_name).toEqual('Very Long Application Name That Contains Many Words And Characters');
    expect(result.package_name).toEqual('com.very.long.package.name.that.contains.many.segments.and.characters');
  });
});
