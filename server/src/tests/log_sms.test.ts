
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, devicesTable, smsLogsTable } from '../db/schema';
import { type CreateSmsLogInput } from '../schema';
import { logSms } from '../handlers/log_sms';
import { eq } from 'drizzle-orm';

// Test data setup
const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      role: 'child',
      full_name: 'Test User'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestDevice = async (userId: number) => {
  const result = await db.insert(devicesTable)
    .values({
      user_id: userId,
      device_name: 'Test Device',
      device_type: 'android',
      device_id: 'test_device_123'
    })
    .returning()
    .execute();
  return result[0];
};

const testTimestamp = new Date('2024-01-15T10:30:00Z');

const testInput: CreateSmsLogInput = {
  device_id: 1,
  phone_number: '+1234567890',
  contact_name: 'John Doe',
  message_type: 'sent',
  message_length: 145,
  timestamp: testTimestamp
};

describe('logSms', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create SMS log with all fields', async () => {
    const user = await createTestUser();
    const device = await createTestDevice(user.id);
    
    const input = { ...testInput, device_id: device.id };
    const result = await logSms(input);

    // Basic field validation
    expect(result.device_id).toEqual(device.id);
    expect(result.phone_number).toEqual('+1234567890');
    expect(result.contact_name).toEqual('John Doe');
    expect(result.message_type).toEqual('sent');
    expect(result.message_length).toEqual(145);
    expect(result.timestamp).toEqual(testTimestamp);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create SMS log without contact name', async () => {
    const user = await createTestUser();
    const device = await createTestDevice(user.id);
    
    const input: CreateSmsLogInput = {
      device_id: device.id,
      phone_number: '+1987654321',
      message_type: 'received',
      message_length: 89,
      timestamp: testTimestamp
    };

    const result = await logSms(input);

    expect(result.device_id).toEqual(device.id);
    expect(result.phone_number).toEqual('+1987654321');
    expect(result.contact_name).toBeNull();
    expect(result.message_type).toEqual('received');
    expect(result.message_length).toEqual(89);
    expect(result.timestamp).toEqual(testTimestamp);
  });

  it('should save SMS log to database', async () => {
    const user = await createTestUser();
    const device = await createTestDevice(user.id);
    
    const input = { ...testInput, device_id: device.id };
    const result = await logSms(input);

    // Query database to verify record was saved
    const smsLogs = await db.select()
      .from(smsLogsTable)
      .where(eq(smsLogsTable.id, result.id))
      .execute();

    expect(smsLogs).toHaveLength(1);
    expect(smsLogs[0].device_id).toEqual(device.id);
    expect(smsLogs[0].phone_number).toEqual('+1234567890');
    expect(smsLogs[0].contact_name).toEqual('John Doe');
    expect(smsLogs[0].message_type).toEqual('sent');
    expect(smsLogs[0].message_length).toEqual(145);
    expect(smsLogs[0].timestamp).toEqual(testTimestamp);
    expect(smsLogs[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle different message types', async () => {
    const user = await createTestUser();
    const device = await createTestDevice(user.id);

    // Test received message
    const receivedInput: CreateSmsLogInput = {
      device_id: device.id,
      phone_number: '+1111111111',
      message_type: 'received',
      message_length: 50,
      timestamp: testTimestamp
    };

    const receivedResult = await logSms(receivedInput);
    expect(receivedResult.message_type).toEqual('received');

    // Test sent message
    const sentInput: CreateSmsLogInput = {
      device_id: device.id,
      phone_number: '+2222222222',
      message_type: 'sent',
      message_length: 75,
      timestamp: testTimestamp
    };

    const sentResult = await logSms(sentInput);
    expect(sentResult.message_type).toEqual('sent');
  });

  it('should handle zero-length messages', async () => {
    const user = await createTestUser();
    const device = await createTestDevice(user.id);
    
    const input: CreateSmsLogInput = {
      device_id: device.id,
      phone_number: '+1000000000',
      message_type: 'received',
      message_length: 0,
      timestamp: testTimestamp
    };

    const result = await logSms(input);
    expect(result.message_length).toEqual(0);
  });
});
