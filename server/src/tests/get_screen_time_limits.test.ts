
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, devicesTable, screenTimeLimitsTable } from '../db/schema';
import { type GetScreenTimeLimitsInput } from '../schema';
import { getScreenTimeLimits } from '../handlers/get_screen_time_limits';

const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  role: 'child' as const,
  full_name: 'Test Child'
};

const testDevice = {
  user_id: 1,
  device_name: 'Test Device',
  device_type: 'android' as const,
  device_id: 'test_device_123'
};

const testLimit1 = {
  device_id: 1,
  daily_limit: 7200, // 2 hours
  app_specific_limits: { "com.youtube.app": 1800, "com.instagram.app": 900 },
  is_active: true
};

const testLimit2 = {
  device_id: 1,
  daily_limit: 3600, // 1 hour
  app_specific_limits: null,
  is_active: false
};

describe('getScreenTimeLimits', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return screen time limits for device', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(devicesTable).values(testDevice).execute();
    await db.insert(screenTimeLimitsTable).values(testLimit1).execute();

    const input: GetScreenTimeLimitsInput = { deviceId: 1 };
    const results = await getScreenTimeLimits(input);

    expect(results).toHaveLength(1);
    expect(results[0].device_id).toBe(1);
    expect(results[0].daily_limit).toBe(7200);
    expect(results[0].app_specific_limits).toEqual({ "com.youtube.app": 1800, "com.instagram.app": 900 });
    expect(results[0].is_active).toBe(true);
    expect(results[0].id).toBeDefined();
    expect(results[0].created_at).toBeInstanceOf(Date);
    expect(results[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple screen time limits for device', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(devicesTable).values(testDevice).execute();
    await db.insert(screenTimeLimitsTable).values([testLimit1, testLimit2]).execute();

    const input: GetScreenTimeLimitsInput = { deviceId: 1 };
    const results = await getScreenTimeLimits(input);

    expect(results).toHaveLength(2);
    
    // First limit
    const activeLimit = results.find(l => l.is_active);
    expect(activeLimit).toBeDefined();
    expect(activeLimit!.daily_limit).toBe(7200);
    expect(activeLimit!.app_specific_limits).toEqual({ "com.youtube.app": 1800, "com.instagram.app": 900 });
    
    // Second limit
    const inactiveLimit = results.find(l => !l.is_active);
    expect(inactiveLimit).toBeDefined();
    expect(inactiveLimit!.daily_limit).toBe(3600);
    expect(inactiveLimit!.app_specific_limits).toBeNull();
  });

  it('should return empty array for device with no limits', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(devicesTable).values(testDevice).execute();

    const input: GetScreenTimeLimitsInput = { deviceId: 1 };
    const results = await getScreenTimeLimits(input);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should return empty array for non-existent device', async () => {
    const input: GetScreenTimeLimitsInput = { deviceId: 999 };
    const results = await getScreenTimeLimits(input);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should handle null app_specific_limits correctly', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(devicesTable).values(testDevice).execute();
    await db.insert(screenTimeLimitsTable).values({
      device_id: 1,
      daily_limit: 5400,
      app_specific_limits: null,
      is_active: true
    }).execute();

    const input: GetScreenTimeLimitsInput = { deviceId: 1 };
    const results = await getScreenTimeLimits(input);

    expect(results).toHaveLength(1);
    expect(results[0].app_specific_limits).toBeNull();
    expect(results[0].daily_limit).toBe(5400);
  });
});
