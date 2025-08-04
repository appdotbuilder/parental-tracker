
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  devicesTable, 
  appUsageTable, 
  locationTrackingTable, 
  callLogsTable, 
  smsLogsTable, 
  webFiltersTable,
  activityReportsTable
} from '../db/schema';
import { type GetActivityReportInput } from '../schema';
import { generateActivityReport } from '../handlers/generate_activity_report';
import { eq } from 'drizzle-orm';

describe('generateActivityReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate comprehensive activity report', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
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
        device_id: 'test-device-123'
      })
      .returning()
      .execute();

    const deviceId = deviceResult[0].id;

    const startDate = new Date('2024-01-01T00:00:00Z');
    const endDate = new Date('2024-01-01T23:59:59Z');
    const testTime = new Date('2024-01-01T12:00:00Z');

    // Create test app usage data
    await db.insert(appUsageTable)
      .values([
        {
          device_id: deviceId,
          app_name: 'Instagram',
          package_name: 'com.instagram.android',
          usage_duration: 3600, // 1 hour
          start_time: testTime
        },
        {
          device_id: deviceId,
          app_name: 'TikTok',
          package_name: 'com.tiktok.android',
          usage_duration: 7200, // 2 hours
          start_time: testTime
        }
      ])
      .execute();

    // Create location tracking data - convert numbers to strings for decimal columns
    await db.insert(locationTrackingTable)
      .values([
        {
          device_id: deviceId,
          latitude: '40.71280000',
          longitude: '-74.00600000',
          timestamp: testTime
        },
        {
          device_id: deviceId,
          latitude: '40.75890000',
          longitude: '-73.98510000',
          timestamp: testTime
        }
      ])
      .execute();

    // Create call logs
    await db.insert(callLogsTable)
      .values([
        {
          device_id: deviceId,
          phone_number: '+1234567890',
          call_type: 'outgoing',
          duration: 300,
          timestamp: testTime
        },
        {
          device_id: deviceId,
          phone_number: '+1987654321',
          call_type: 'incoming',
          duration: 180,
          timestamp: testTime
        }
      ])
      .execute();

    // Create SMS logs
    await db.insert(smsLogsTable)
      .values([
        {
          device_id: deviceId,
          phone_number: '+1234567890',
          message_type: 'sent',
          message_length: 50,
          timestamp: testTime
        },
        {
          device_id: deviceId,
          phone_number: '+1987654321',
          message_type: 'received',
          message_length: 30,
          timestamp: testTime
        }
      ])
      .execute();

    // Create web filter
    await db.insert(webFiltersTable)
      .values({
        device_id: deviceId,
        blocked_domains: ['facebook.com', 'twitter.com', 'youtube.com'],
        blocked_categories: ['social'],
        allowed_domains: ['google.com'],
        is_active: true
      })
      .execute();

    const input: GetActivityReportInput = {
      device_id: deviceId,
      start_date: startDate,
      end_date: endDate
    };

    const result = await generateActivityReport(input);

    // Verify report structure
    expect(result.id).toBeDefined();
    expect(result.device_id).toEqual(deviceId);
    expect(result.report_date).toEqual(startDate);
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify aggregated data
    expect(result.total_screen_time).toEqual(10800); // 3600 + 7200 = 3 hours
    expect(result.most_used_apps).toHaveLength(2);
    expect(result.most_used_apps[0].app_name).toEqual('TikTok');
    expect(result.most_used_apps[0].usage_time).toEqual(7200);
    expect(result.most_used_apps[1].app_name).toEqual('Instagram');
    expect(result.most_used_apps[1].usage_time).toEqual(3600);

    expect(result.locations_visited).toEqual(2);
    expect(result.calls_made).toEqual(1); // Only outgoing calls
    expect(result.sms_sent).toEqual(1); // Only sent messages
    expect(result.websites_blocked).toEqual(3); // Number of blocked domains
  });

  it('should save report to database', async () => {
    // Create test user and device
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
        role: 'child',
        full_name: 'Test Child'
      })
      .returning()
      .execute();

    const deviceResult = await db.insert(devicesTable)
      .values({
        user_id: userResult[0].id,
        device_name: 'Test Device',
        device_type: 'android',
        device_id: 'test-device-123'
      })
      .returning()
      .execute();

    const input: GetActivityReportInput = {
      device_id: deviceResult[0].id,
      start_date: new Date('2024-01-01T00:00:00Z'),
      end_date: new Date('2024-01-01T23:59:59Z')
    };

    const result = await generateActivityReport(input);

    // Verify report exists in database
    const savedReports = await db.select()
      .from(activityReportsTable)
      .where(eq(activityReportsTable.id, result.id))
      .execute();

    expect(savedReports).toHaveLength(1);
    expect(savedReports[0].device_id).toEqual(input.device_id);
    expect(savedReports[0].report_date).toEqual(input.start_date);
    expect(savedReports[0].total_screen_time).toEqual(0); // No app usage data
    expect(Array.isArray(savedReports[0].most_used_apps)).toBe(true);
  });

  it('should handle empty data gracefully', async () => {
    // Create test user and device without any activity data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
        role: 'child',
        full_name: 'Test Child'
      })
      .returning()
      .execute();

    const deviceResult = await db.insert(devicesTable)
      .values({
        user_id: userResult[0].id,
        device_name: 'Test Device',
        device_type: 'android',
        device_id: 'test-device-123'
      })
      .returning()
      .execute();

    const input: GetActivityReportInput = {
      device_id: deviceResult[0].id,
      start_date: new Date('2024-01-01T00:00:00Z'),
      end_date: new Date('2024-01-01T23:59:59Z')
    };

    const result = await generateActivityReport(input);

    // Verify zero values for empty data
    expect(result.total_screen_time).toEqual(0);
    expect(result.most_used_apps).toEqual([]);
    expect(result.locations_visited).toEqual(0);
    expect(result.calls_made).toEqual(0);
    expect(result.sms_sent).toEqual(0);
    expect(result.websites_blocked).toEqual(0);
  });

  it('should filter data by date range correctly', async () => {
    // Create test user and device
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
        role: 'child',
        full_name: 'Test Child'
      })
      .returning()
      .execute();

    const deviceResult = await db.insert(devicesTable)
      .values({
        user_id: userResult[0].id,
        device_name: 'Test Device',
        device_type: 'android',
        device_id: 'test-device-123'
      })
      .returning()
      .execute();

    const deviceId = deviceResult[0].id;

    // Create app usage data - one inside range, one outside
    await db.insert(appUsageTable)
      .values([
        {
          device_id: deviceId,
          app_name: 'Instagram',
          package_name: 'com.instagram.android',
          usage_duration: 3600,
          start_time: new Date('2024-01-01T12:00:00Z') // Inside range
        },
        {
          device_id: deviceId,
          app_name: 'TikTok',
          package_name: 'com.tiktok.android',
          usage_duration: 7200,
          start_time: new Date('2024-01-02T12:00:00Z') // Outside range
        }
      ])
      .execute();

    const input: GetActivityReportInput = {
      device_id: deviceId,
      start_date: new Date('2024-01-01T00:00:00Z'),
      end_date: new Date('2024-01-01T23:59:59Z')
    };

    const result = await generateActivityReport(input);

    // Should only include data from within the date range
    expect(result.total_screen_time).toEqual(3600); // Only Instagram usage
    expect(result.most_used_apps).toHaveLength(1);
    expect(result.most_used_apps[0].app_name).toEqual('Instagram');
  });
});
