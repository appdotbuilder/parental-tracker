
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, devicesTable, screenTimeLimitsTable } from '../db/schema';
import { type CreateScreenTimeLimitInput } from '../schema';
import { setScreenTimeLimit } from '../handlers/set_screen_time_limit';
import { eq } from 'drizzle-orm';

describe('setScreenTimeLimit', () => {
  let testUserId: number;
  let testDeviceId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'child@example.com',
        password_hash: 'hashed_password',
        role: 'child',
        full_name: 'Test Child'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test device
    const deviceResult = await db.insert(devicesTable)
      .values({
        user_id: testUserId,
        device_name: 'Child Phone',
        device_type: 'android',
        device_id: 'test_device_123'
      })
      .returning()
      .execute();
    testDeviceId = deviceResult[0].id;
  });

  afterEach(resetDB);

  it('should create a screen time limit with daily limit only', async () => {
    const input: CreateScreenTimeLimitInput = {
      device_id: testDeviceId,
      daily_limit: 120 // 2 hours in minutes
    };

    const result = await setScreenTimeLimit(input);

    expect(result.device_id).toEqual(testDeviceId);
    expect(result.daily_limit).toEqual(120);
    expect(result.app_specific_limits).toBeNull();
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a screen time limit with app-specific limits', async () => {
    const appLimits = {
      'com.instagram.android': 30,
      'com.tiktok': 15,
      'com.youtube.android': 45
    };

    const input: CreateScreenTimeLimitInput = {
      device_id: testDeviceId,
      daily_limit: 180, // 3 hours
      app_specific_limits: appLimits
    };

    const result = await setScreenTimeLimit(input);

    expect(result.device_id).toEqual(testDeviceId);
    expect(result.daily_limit).toEqual(180);
    expect(result.app_specific_limits).toEqual(appLimits);
    expect(result.is_active).toBe(true);
  });

  it('should save screen time limit to database', async () => {
    const input: CreateScreenTimeLimitInput = {
      device_id: testDeviceId,
      daily_limit: 90
    };

    const result = await setScreenTimeLimit(input);

    const screenTimeLimits = await db.select()
      .from(screenTimeLimitsTable)
      .where(eq(screenTimeLimitsTable.id, result.id))
      .execute();

    expect(screenTimeLimits).toHaveLength(1);
    expect(screenTimeLimits[0].device_id).toEqual(testDeviceId);
    expect(screenTimeLimits[0].daily_limit).toEqual(90);
    expect(screenTimeLimits[0].is_active).toBe(true);
  });

  it('should throw error for non-existent device', async () => {
    const input: CreateScreenTimeLimitInput = {
      device_id: 99999, // Non-existent device
      daily_limit: 60
    };

    expect(setScreenTimeLimit(input)).rejects.toThrow(/device.*not found/i);
  });

  it('should handle multiple screen time limits for same device', async () => {
    const input1: CreateScreenTimeLimitInput = {
      device_id: testDeviceId,
      daily_limit: 120
    };

    const input2: CreateScreenTimeLimitInput = {
      device_id: testDeviceId,
      daily_limit: 90,
      app_specific_limits: { 'com.example.app': 30 }
    };

    const result1 = await setScreenTimeLimit(input1);
    const result2 = await setScreenTimeLimit(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.daily_limit).toEqual(120);
    expect(result2.daily_limit).toEqual(90);

    // Verify both records exist in database
    const allLimits = await db.select()
      .from(screenTimeLimitsTable)
      .where(eq(screenTimeLimitsTable.device_id, testDeviceId))
      .execute();

    expect(allLimits).toHaveLength(2);
  });
});
