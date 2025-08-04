
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, devicesTable, webFiltersTable } from '../db/schema';
import { getWebFilters } from '../handlers/get_web_filters';

describe('getWebFilters', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return web filters for a device', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'child@test.com',
        password_hash: 'hashed_password',
        role: 'child',
        full_name: 'Test Child'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test device
    const deviceResult = await db.insert(devicesTable)
      .values({
        user_id: userId,
        device_name: 'Test Device',
        device_type: 'android',
        device_id: 'test_device_123'
      })
      .returning()
      .execute();

    const deviceId = deviceResult[0].id;

    // Create test web filters
    await db.insert(webFiltersTable)
      .values([
        {
          device_id: deviceId,
          blocked_domains: ['facebook.com', 'twitter.com'],
          blocked_categories: ['social_media', 'adult_content'],
          allowed_domains: ['education.com', 'wikipedia.org'],
          is_active: true
        },
        {
          device_id: deviceId,
          blocked_domains: ['gaming.com'],
          blocked_categories: ['gaming'],
          allowed_domains: ['school.edu'],
          is_active: false
        }
      ])
      .execute();

    const result = await getWebFilters(deviceId);

    expect(result).toHaveLength(2);
    
    // Check first filter
    const activeFilter = result.find(f => f.is_active);
    expect(activeFilter).toBeDefined();
    expect(activeFilter!.device_id).toBe(deviceId);
    expect(activeFilter!.blocked_domains).toEqual(['facebook.com', 'twitter.com']);
    expect(activeFilter!.blocked_categories).toEqual(['social_media', 'adult_content']);
    expect(activeFilter!.allowed_domains).toEqual(['education.com', 'wikipedia.org']);
    expect(activeFilter!.is_active).toBe(true);
    expect(activeFilter!.created_at).toBeInstanceOf(Date);
    expect(activeFilter!.updated_at).toBeInstanceOf(Date);

    // Check second filter
    const inactiveFilter = result.find(f => !f.is_active);
    expect(inactiveFilter).toBeDefined();
    expect(inactiveFilter!.device_id).toBe(deviceId);
    expect(inactiveFilter!.blocked_domains).toEqual(['gaming.com']);
    expect(inactiveFilter!.blocked_categories).toEqual(['gaming']);
    expect(inactiveFilter!.allowed_domains).toEqual(['school.edu']);
    expect(inactiveFilter!.is_active).toBe(false);
  });

  it('should return empty array for device with no web filters', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'child@test.com',
        password_hash: 'hashed_password',
        role: 'child',
        full_name: 'Test Child'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test device
    const deviceResult = await db.insert(devicesTable)
      .values({
        user_id: userId,
        device_name: 'Test Device',
        device_type: 'android',
        device_id: 'test_device_123'
      })
      .returning()
      .execute();

    const deviceId = deviceResult[0].id;

    const result = await getWebFilters(deviceId);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-existent device', async () => {
    const result = await getWebFilters(99999);

    expect(result).toHaveLength(0);
  });

  it('should handle empty arrays in JSONB fields', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'child@test.com',
        password_hash: 'hashed_password',
        role: 'child',
        full_name: 'Test Child'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test device
    const deviceResult = await db.insert(devicesTable)
      .values({
        user_id: userId,
        device_name: 'Test Device',
        device_type: 'android',
        device_id: 'test_device_123'
      })
      .returning()
      .execute();

    const deviceId = deviceResult[0].id;

    // Create web filter with empty arrays
    await db.insert(webFiltersTable)
      .values({
        device_id: deviceId,
        blocked_domains: [],
        blocked_categories: [],
        allowed_domains: [],
        is_active: true
      })
      .execute();

    const result = await getWebFilters(deviceId);

    expect(result).toHaveLength(1);
    expect(result[0].blocked_domains).toEqual([]);
    expect(result[0].blocked_categories).toEqual([]);
    expect(result[0].allowed_domains).toEqual([]);
  });
});
