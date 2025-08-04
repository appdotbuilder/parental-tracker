
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, devicesTable, webFiltersTable } from '../db/schema';
import { type CreateWebFilterInput } from '../schema';
import { setWebFilter } from '../handlers/set_web_filter';
import { eq } from 'drizzle-orm';

describe('setWebFilter', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testDeviceId: number;

  beforeEach(async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        password_hash: 'hashed_password',
        role: 'child',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    // Create a test device
    const deviceResult = await db.insert(devicesTable)
      .values({
        user_id: userResult[0].id,
        device_name: 'Test Device',
        device_type: 'android',
        device_id: 'test_device_123'
      })
      .returning()
      .execute();

    testDeviceId = deviceResult[0].id;
  });

  it('should create web filter with all arrays', async () => {
    const input: CreateWebFilterInput = {
      device_id: testDeviceId,
      blocked_domains: ['example.com', 'badsite.com'],
      blocked_categories: ['adult', 'gambling'],
      allowed_domains: ['school.edu', 'homework.com']
    };

    const result = await setWebFilter(input);

    expect(result.device_id).toEqual(testDeviceId);
    expect(result.blocked_domains).toEqual(['example.com', 'badsite.com']);
    expect(result.blocked_categories).toEqual(['adult', 'gambling']);
    expect(result.allowed_domains).toEqual(['school.edu', 'homework.com']);
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create web filter with empty arrays when optional fields not provided', async () => {
    const input: CreateWebFilterInput = {
      device_id: testDeviceId
    };

    const result = await setWebFilter(input);

    expect(result.device_id).toEqual(testDeviceId);
    expect(result.blocked_domains).toEqual([]);
    expect(result.blocked_categories).toEqual([]);
    expect(result.allowed_domains).toEqual([]);
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save web filter to database', async () => {
    const input: CreateWebFilterInput = {
      device_id: testDeviceId,
      blocked_domains: ['example.com'],
      blocked_categories: ['adult'],
      allowed_domains: ['school.edu']
    };

    const result = await setWebFilter(input);

    const webFilters = await db.select()
      .from(webFiltersTable)
      .where(eq(webFiltersTable.id, result.id))
      .execute();

    expect(webFilters).toHaveLength(1);
    expect(webFilters[0].device_id).toEqual(testDeviceId);
    expect(webFilters[0].blocked_domains).toEqual(['example.com']);
    expect(webFilters[0].blocked_categories).toEqual(['adult']);
    expect(webFilters[0].allowed_domains).toEqual(['school.edu']);
    expect(webFilters[0].is_active).toBe(true);
    expect(webFilters[0].created_at).toBeInstanceOf(Date);
    expect(webFilters[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when device does not exist', async () => {
    const input: CreateWebFilterInput = {
      device_id: 99999,
      blocked_domains: ['example.com']
    };

    expect(setWebFilter(input)).rejects.toThrow(/device with id 99999 not found/i);
  });
});
