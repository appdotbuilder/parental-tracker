
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, devicesTable, callLogsTable } from '../db/schema';
import { type CreateCallLogInput } from '../schema';
import { logCall } from '../handlers/log_call';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  email: 'testparent@example.com',
  password_hash: 'hashedpassword',
  role: 'parent' as const,
  full_name: 'Test Parent'
};

const testDevice = {
  device_name: 'Test Phone',
  device_type: 'android' as const,
  device_id: 'test-device-123'
};

describe('logCall', () => {
  let userId: number;
  let deviceId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test device
    const deviceResult = await db.insert(devicesTable)
      .values({
        ...testDevice,
        user_id: userId
      })
      .returning()
      .execute();
    deviceId = deviceResult[0].id;
  });

  afterEach(resetDB);

  it('should log an incoming call with contact name', async () => {
    const testInput: CreateCallLogInput = {
      device_id: deviceId,
      phone_number: '+1234567890',
      contact_name: 'John Doe',
      call_type: 'incoming',
      duration: 120,
      timestamp: new Date('2024-01-15T10:30:00Z')
    };

    const result = await logCall(testInput);

    // Basic field validation
    expect(result.device_id).toEqual(deviceId);
    expect(result.phone_number).toEqual('+1234567890');
    expect(result.contact_name).toEqual('John Doe');
    expect(result.call_type).toEqual('incoming');
    expect(result.duration).toEqual(120);
    expect(result.timestamp).toEqual(new Date('2024-01-15T10:30:00Z'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should log an outgoing call without contact name', async () => {
    const testInput: CreateCallLogInput = {
      device_id: deviceId,
      phone_number: '+0987654321',
      call_type: 'outgoing',
      duration: 45,
      timestamp: new Date('2024-01-15T14:15:00Z')
    };

    const result = await logCall(testInput);

    expect(result.device_id).toEqual(deviceId);
    expect(result.phone_number).toEqual('+0987654321');
    expect(result.contact_name).toBeNull();
    expect(result.call_type).toEqual('outgoing');
    expect(result.duration).toEqual(45);
    expect(result.timestamp).toEqual(new Date('2024-01-15T14:15:00Z'));
  });

  it('should log a missed call with zero duration', async () => {
    const testInput: CreateCallLogInput = {
      device_id: deviceId,
      phone_number: '+1122334455',
      contact_name: 'Unknown Caller',
      call_type: 'missed',
      duration: 0,
      timestamp: new Date('2024-01-15T16:45:00Z')
    };

    const result = await logCall(testInput);

    expect(result.call_type).toEqual('missed');
    expect(result.duration).toEqual(0);
    expect(result.contact_name).toEqual('Unknown Caller');
  });

  it('should save call log to database', async () => {
    const testInput: CreateCallLogInput = {
      device_id: deviceId,
      phone_number: '+5555555555',
      contact_name: 'Test Contact',
      call_type: 'incoming',
      duration: 300,
      timestamp: new Date('2024-01-15T12:00:00Z')
    };

    const result = await logCall(testInput);

    // Query database to verify record was saved
    const callLogs = await db.select()
      .from(callLogsTable)
      .where(eq(callLogsTable.id, result.id))
      .execute();

    expect(callLogs).toHaveLength(1);
    expect(callLogs[0].device_id).toEqual(deviceId);
    expect(callLogs[0].phone_number).toEqual('+5555555555');
    expect(callLogs[0].contact_name).toEqual('Test Contact');
    expect(callLogs[0].call_type).toEqual('incoming');
    expect(callLogs[0].duration).toEqual(300);
    expect(callLogs[0].timestamp).toEqual(new Date('2024-01-15T12:00:00Z'));
    expect(callLogs[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle multiple call logs for same device', async () => {
    const call1: CreateCallLogInput = {
      device_id: deviceId,
      phone_number: '+1111111111',
      call_type: 'outgoing',
      duration: 60,
      timestamp: new Date('2024-01-15T09:00:00Z')
    };

    const call2: CreateCallLogInput = {
      device_id: deviceId,
      phone_number: '+2222222222',
      call_type: 'incoming',
      duration: 90,
      timestamp: new Date('2024-01-15T09:30:00Z')
    };

    const result1 = await logCall(call1);
    const result2 = await logCall(call2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.phone_number).toEqual('+1111111111');
    expect(result2.phone_number).toEqual('+2222222222');

    // Verify both records exist in database
    const allCallLogs = await db.select()
      .from(callLogsTable)
      .where(eq(callLogsTable.device_id, deviceId))
      .execute();

    expect(allCallLogs).toHaveLength(2);
  });
});
