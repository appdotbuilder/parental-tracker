
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, devicesTable, appUsageTable } from '../db/schema';
import { type GetAppUsageInput, type CreateUserInput, type CreateDeviceInput, type CreateAppUsageInput } from '../schema';
import { getAppUsage } from '../handlers/get_app_usage';

// Test data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  role: 'child' as const,
  full_name: 'Test Child'
};

const testDevice: CreateDeviceInput = {
  user_id: 1, // Will be set after user creation
  device_name: 'Test Device',
  device_type: 'android' as const,
  device_id: 'test-device-123'
};

const testAppUsage1: CreateAppUsageInput = {
  device_id: 1, // Will be set after device creation
  app_name: 'Instagram',
  package_name: 'com.instagram.android',
  usage_duration: 3600, // 1 hour in seconds
  start_time: new Date('2024-01-15T10:00:00Z'),
  end_time: new Date('2024-01-15T11:00:00Z')
};

const testAppUsage2: CreateAppUsageInput = {
  device_id: 1,
  app_name: 'TikTok',
  package_name: 'com.tiktok.android',
  usage_duration: 1800, // 30 minutes in seconds
  start_time: new Date('2024-01-15T14:00:00Z'),
  end_time: new Date('2024-01-15T14:30:00Z')
};

const testAppUsageOutsideRange: CreateAppUsageInput = {
  device_id: 1,
  app_name: 'YouTube',
  package_name: 'com.youtube.android',
  usage_duration: 2400, // 40 minutes in seconds
  start_time: new Date('2024-01-10T09:00:00Z'),
  end_time: new Date('2024-01-10T09:40:00Z')
};

describe('getAppUsage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get app usage records within date range', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role,
        full_name: testUser.full_name
      })
      .returning()
      .execute();

    const deviceResult = await db.insert(devicesTable)
      .values({
        ...testDevice,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    const deviceId = deviceResult[0].id;

    // Create app usage records
    await db.insert(appUsageTable)
      .values([
        { ...testAppUsage1, device_id: deviceId },
        { ...testAppUsage2, device_id: deviceId },
        { ...testAppUsageOutsideRange, device_id: deviceId }
      ])
      .execute();

    const input: GetAppUsageInput = {
      deviceId: deviceId,
      startDate: new Date('2024-01-15T00:00:00Z'),
      endDate: new Date('2024-01-15T23:59:59Z')
    };

    const results = await getAppUsage(input);

    expect(results).toHaveLength(2);
    
    // Verify first app usage record
    const instagramUsage = results.find(r => r.app_name === 'Instagram');
    expect(instagramUsage).toBeDefined();
    expect(instagramUsage?.package_name).toBe('com.instagram.android');
    expect(instagramUsage?.usage_duration).toBe(3600);
    expect(instagramUsage?.start_time).toBeInstanceOf(Date);
    expect(instagramUsage?.end_time).toBeInstanceOf(Date);

    // Verify second app usage record
    const tiktokUsage = results.find(r => r.app_name === 'TikTok');
    expect(tiktokUsage).toBeDefined();
    expect(tiktokUsage?.package_name).toBe('com.tiktok.android');
    expect(tiktokUsage?.usage_duration).toBe(1800);

    // Verify that the outside-range record is not included
    const youtubeUsage = results.find(r => r.app_name === 'YouTube');
    expect(youtubeUsage).toBeUndefined();
  });

  it('should return empty array when no app usage records exist', async () => {
    // Create prerequisite data without app usage records
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role,
        full_name: testUser.full_name
      })
      .returning()
      .execute();

    const deviceResult = await db.insert(devicesTable)
      .values({
        ...testDevice,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    const input: GetAppUsageInput = {
      deviceId: deviceResult[0].id,
      startDate: new Date('2024-01-15T00:00:00Z'),
      endDate: new Date('2024-01-15T23:59:59Z')
    };

    const results = await getAppUsage(input);

    expect(results).toHaveLength(0);
  });

  it('should return empty array when device does not exist', async () => {
    const input: GetAppUsageInput = {
      deviceId: 999, // Non-existent device ID
      startDate: new Date('2024-01-15T00:00:00Z'),
      endDate: new Date('2024-01-15T23:59:59Z')
    };

    const results = await getAppUsage(input);

    expect(results).toHaveLength(0);
  });

  it('should filter records correctly by date boundaries', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role,
        full_name: testUser.full_name
      })
      .returning()
      .execute();

    const deviceResult = await db.insert(devicesTable)
      .values({
        ...testDevice,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    const deviceId = deviceResult[0].id;

    // Create app usage records with precise boundary times
    const boundaryUsage1 = {
      ...testAppUsage1,
      device_id: deviceId,
      start_time: new Date('2024-01-15T00:00:00Z') // Exactly at start boundary
    };

    const boundaryUsage2 = {
      ...testAppUsage2,
      device_id: deviceId,
      start_time: new Date('2024-01-15T23:59:59Z') // Exactly at end boundary
    };

    await db.insert(appUsageTable)
      .values([boundaryUsage1, boundaryUsage2])
      .execute();

    const input: GetAppUsageInput = {
      deviceId: deviceId,
      startDate: new Date('2024-01-15T00:00:00Z'),
      endDate: new Date('2024-01-15T23:59:59Z')
    };

    const results = await getAppUsage(input);

    expect(results).toHaveLength(2);
    expect(results.every(r => r.device_id === deviceId)).toBe(true);
  });
});
