
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, devicesTable, smsLogsTable } from '../db/schema';
import { type GetSmsLogsInput } from '../schema';
import { getSmsLogs } from '../handlers/get_sms_logs';

describe('getSmsLogs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get SMS logs for device within date range', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'child@test.com',
        password_hash: 'hashed_password',
        role: 'child',
        full_name: 'Test Child'
      })
      .returning()
      .execute();

    // Create test device
    const [device] = await db.insert(devicesTable)
      .values({
        user_id: user.id,
        device_name: 'Test Phone',
        device_type: 'android',
        device_id: 'test-device-123'
      })
      .returning()
      .execute();

    // Create test SMS logs
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const today = new Date();
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // SMS log within range
    await db.insert(smsLogsTable)
      .values({
        device_id: device.id,
        phone_number: '+1234567890',
        contact_name: 'Mom',
        message_type: 'received',
        message_length: 25,
        timestamp: today
      })
      .execute();

    // SMS log outside range (older)
    await db.insert(smsLogsTable)
      .values({
        device_id: device.id,
        phone_number: '+0987654321',
        contact_name: 'Friend',
        message_type: 'sent',
        message_length: 30,
        timestamp: yesterday
      })
      .execute();

    const input: GetSmsLogsInput = {
      deviceId: device.id,
      startDate: today,
      endDate: tomorrow
    };

    const result = await getSmsLogs(input);

    // Should only return SMS log within date range
    expect(result).toHaveLength(1);
    expect(result[0].phone_number).toEqual('+1234567890');
    expect(result[0].contact_name).toEqual('Mom');
    expect(result[0].message_type).toEqual('received');
    expect(result[0].message_length).toEqual(25);
    expect(result[0].device_id).toEqual(device.id);
    expect(result[0].timestamp).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return empty array when no SMS logs found', async () => {
    // Create test user and device
    const [user] = await db.insert(usersTable)
      .values({
        email: 'child@test.com',
        password_hash: 'hashed_password',
        role: 'child',
        full_name: 'Test Child'
      })
      .returning()
      .execute();

    const [device] = await db.insert(devicesTable)
      .values({
        user_id: user.id,
        device_name: 'Test Phone',
        device_type: 'android',
        device_id: 'test-device-123'
      })
      .returning()
      .execute();

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const input: GetSmsLogsInput = {
      deviceId: device.id,
      startDate: today,
      endDate: tomorrow
    };

    const result = await getSmsLogs(input);
    expect(result).toHaveLength(0);
  });

  it('should filter SMS logs by device ID correctly', async () => {
    // Create test users
    const [user1] = await db.insert(usersTable)
      .values({
        email: 'child1@test.com',
        password_hash: 'hashed_password',
        role: 'child',
        full_name: 'Test Child 1'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        email: 'child2@test.com',
        password_hash: 'hashed_password',
        role: 'child',
        full_name: 'Test Child 2'
      })
      .returning()
      .execute();

    // Create test devices
    const [device1] = await db.insert(devicesTable)
      .values({
        user_id: user1.id,
        device_name: 'Phone 1',
        device_type: 'android',
        device_id: 'device-1'
      })
      .returning()
      .execute();

    const [device2] = await db.insert(devicesTable)
      .values({
        user_id: user2.id,
        device_name: 'Phone 2',
        device_type: 'ios',
        device_id: 'device-2'
      })
      .returning()
      .execute();

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create SMS logs for both devices
    await db.insert(smsLogsTable)
      .values({
        device_id: device1.id,
        phone_number: '+1111111111',
        message_type: 'sent',
        message_length: 20,
        timestamp: today
      })
      .execute();

    await db.insert(smsLogsTable)
      .values({
        device_id: device2.id,
        phone_number: '+2222222222',
        message_type: 'received',
        message_length: 15,
        timestamp: today
      })
      .execute();

    const input: GetSmsLogsInput = {
      deviceId: device1.id,
      startDate: today,
      endDate: tomorrow
    };

    const result = await getSmsLogs(input);

    // Should only return SMS logs for device1
    expect(result).toHaveLength(1);
    expect(result[0].device_id).toEqual(device1.id);
    expect(result[0].phone_number).toEqual('+1111111111');
  });

  it('should return SMS logs ordered by timestamp', async () => {
    // Create test user and device
    const [user] = await db.insert(usersTable)
      .values({
        email: 'child@test.com',
        password_hash: 'hashed_password',
        role: 'child',
        full_name: 'Test Child'
      })
      .returning()
      .execute();

    const [device] = await db.insert(devicesTable)
      .values({
        user_id: user.id,
        device_name: 'Test Phone',
        device_type: 'android',
        device_id: 'test-device-123'
      })
      .returning()
      .execute();

    // Create SMS logs with different timestamps
    const baseTime = new Date();
    const time1 = new Date(baseTime.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    const time2 = new Date(baseTime.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago
    const time3 = new Date(baseTime.getTime()); // now

    await db.insert(smsLogsTable)
      .values({
        device_id: device.id,
        phone_number: '+3333333333',
        message_type: 'sent',
        message_length: 30,
        timestamp: time2 // Middle time
      })
      .execute();

    await db.insert(smsLogsTable)
      .values({
        device_id: device.id,
        phone_number: '+1111111111',
        message_type: 'received',
        message_length: 10,
        timestamp: time1 // Earliest time
      })
      .execute();

    await db.insert(smsLogsTable)
      .values({
        device_id: device.id,
        phone_number: '+5555555555',
        message_type: 'sent',
        message_length: 40,
        timestamp: time3 // Latest time
      })
      .execute();

    const startDate = new Date(baseTime.getTime() - 3 * 60 * 60 * 1000);
    const endDate = new Date(baseTime.getTime() + 1 * 60 * 60 * 1000);

    const input: GetSmsLogsInput = {
      deviceId: device.id,
      startDate,
      endDate
    };

    const result = await getSmsLogs(input);

    // Should return 3 SMS logs ordered by timestamp (earliest first)
    expect(result).toHaveLength(3);
    expect(result[0].phone_number).toEqual('+1111111111'); // Earliest
    expect(result[1].phone_number).toEqual('+3333333333'); // Middle
    expect(result[2].phone_number).toEqual('+5555555555'); // Latest
    
    // Verify timestamp ordering
    expect(result[0].timestamp.getTime()).toBeLessThan(result[1].timestamp.getTime());
    expect(result[1].timestamp.getTime()).toBeLessThan(result[2].timestamp.getTime());
  });
});
