
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, devicesTable, activityReportsTable } from '../db/schema';
import { type GetActivityReportsInput } from '../schema';
import { getActivityReports } from '../handlers/get_activity_reports';

// Test input
const testInput: GetActivityReportsInput = {
  deviceId: 1,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31')
};

describe('getActivityReports', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return activity reports for device within date range', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'parent@test.com',
        password_hash: 'hashed_password',
        role: 'parent',
        full_name: 'Test Parent'
      })
      .returning()
      .execute();

    // Create test device
    const device = await db.insert(devicesTable)
      .values({
        user_id: user[0].id,
        device_name: 'Test Device',
        device_type: 'android',
        device_id: 'test_device_123'
      })
      .returning()
      .execute();

    // Create test activity reports
    const report1Date = new Date('2024-01-15');
    const report2Date = new Date('2024-01-20');
    
    await db.insert(activityReportsTable)
      .values([
        {
          device_id: device[0].id,
          report_date: report1Date,
          total_screen_time: 180,
          most_used_apps: [
            { app_name: 'Instagram', usage_time: 90 },
            { app_name: 'Chrome', usage_time: 60 }
          ],
          locations_visited: 5,
          calls_made: 3,
          sms_sent: 8,
          websites_blocked: 2
        },
        {
          device_id: device[0].id,
          report_date: report2Date,
          total_screen_time: 240,
          most_used_apps: [
            { app_name: 'TikTok', usage_time: 120 },
            { app_name: 'WhatsApp', usage_time: 80 }
          ],
          locations_visited: 8,
          calls_made: 5,
          sms_sent: 12,
          websites_blocked: 4
        }
      ])
      .execute();

    const result = await getActivityReports({
      deviceId: device[0].id,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    });

    // Should return reports ordered by date (descending)
    expect(result).toHaveLength(2);
    expect(result[0].report_date).toEqual(report2Date);
    expect(result[1].report_date).toEqual(report1Date);

    // Verify first report data
    expect(result[0].total_screen_time).toEqual(240);
    expect(result[0].most_used_apps).toHaveLength(2);
    expect(result[0].most_used_apps[0].app_name).toEqual('TikTok');
    expect(result[0].most_used_apps[0].usage_time).toEqual(120);
    expect(result[0].locations_visited).toEqual(8);
    expect(result[0].calls_made).toEqual(5);
    expect(result[0].sms_sent).toEqual(12);
    expect(result[0].websites_blocked).toEqual(4);

    // Verify second report data
    expect(result[1].total_screen_time).toEqual(180);
    expect(result[1].most_used_apps).toHaveLength(2);
    expect(result[1].most_used_apps[0].app_name).toEqual('Instagram');
    expect(result[1].most_used_apps[0].usage_time).toEqual(90);
    expect(result[1].locations_visited).toEqual(5);
    expect(result[1].calls_made).toEqual(3);
    expect(result[1].sms_sent).toEqual(8);
    expect(result[1].websites_blocked).toEqual(2);
  });

  it('should return empty array when no reports exist for device', async () => {
    const result = await getActivityReports(testInput);

    expect(result).toHaveLength(0);
  });

  it('should filter reports by date range correctly', async () => {
    // Create test user and device
    const user = await db.insert(usersTable)
      .values({
        email: 'parent@test.com',
        password_hash: 'hashed_password',
        role: 'parent',
        full_name: 'Test Parent'
      })
      .returning()
      .execute();

    const device = await db.insert(devicesTable)
      .values({
        user_id: user[0].id,
        device_name: 'Test Device',
        device_type: 'android',
        device_id: 'test_device_123'
      })
      .returning()
      .execute();

    // Create reports with different dates
    await db.insert(activityReportsTable)
      .values([
        {
          device_id: device[0].id,
          report_date: new Date('2023-12-31'), // Before range
          total_screen_time: 100,
          most_used_apps: [],
          locations_visited: 1,
          calls_made: 1,
          sms_sent: 1,
          websites_blocked: 0
        },
        {
          device_id: device[0].id,
          report_date: new Date('2024-01-15'), // Within range
          total_screen_time: 200,
          most_used_apps: [],
          locations_visited: 2,
          calls_made: 2,
          sms_sent: 2,
          websites_blocked: 0
        },
        {
          device_id: device[0].id,
          report_date: new Date('2024-02-01'), // After range
          total_screen_time: 300,
          most_used_apps: [],
          locations_visited: 3,
          calls_made: 3,
          sms_sent: 3,
          websites_blocked: 0
        }
      ])
      .execute();

    const result = await getActivityReports({
      deviceId: device[0].id,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    });

    // Should only return the report within date range
    expect(result).toHaveLength(1);
    expect(result[0].total_screen_time).toEqual(200);
    expect(result[0].report_date).toEqual(new Date('2024-01-15'));
  });

  it('should only return reports for specified device', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'parent@test.com',
        password_hash: 'hashed_password',
        role: 'parent',
        full_name: 'Test Parent'
      })
      .returning()
      .execute();

    // Create two test devices
    const devices = await db.insert(devicesTable)
      .values([
        {
          user_id: user[0].id,
          device_name: 'Device 1',
          device_type: 'android',
          device_id: 'device_1'
        },
        {
          user_id: user[0].id,
          device_name: 'Device 2',
          device_type: 'ios',
          device_id: 'device_2'
        }
      ])
      .returning()
      .execute();

    // Create reports for both devices
    await db.insert(activityReportsTable)
      .values([
        {
          device_id: devices[0].id,
          report_date: new Date('2024-01-15'),
          total_screen_time: 180,
          most_used_apps: [],
          locations_visited: 5,
          calls_made: 3,
          sms_sent: 8,
          websites_blocked: 2
        },
        {
          device_id: devices[1].id,
          report_date: new Date('2024-01-15'),
          total_screen_time: 240,
          most_used_apps: [],
          locations_visited: 8,
          calls_made: 5,
          sms_sent: 12,
          websites_blocked: 4
        }
      ])
      .execute();

    const result = await getActivityReports({
      deviceId: devices[0].id,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    });

    // Should only return report for specified device
    expect(result).toHaveLength(1);
    expect(result[0].device_id).toEqual(devices[0].id);
    expect(result[0].total_screen_time).toEqual(180);
  });
});
