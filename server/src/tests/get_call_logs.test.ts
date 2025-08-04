
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, devicesTable, callLogsTable } from '../db/schema';
import { type CreateUserInput, type CreateDeviceInput, type CreateCallLogInput, type GetCallLogsInput } from '../schema';
import { getCallLogs } from '../handlers/get_call_logs';
import { eq } from 'drizzle-orm';

// Test user input
const testUserInput: CreateUserInput = {
  email: 'testparent@example.com',
  password: 'password123',
  role: 'parent',
  full_name: 'Test Parent'
};

// Test device input
const testDeviceInput: CreateDeviceInput = {
  user_id: 1, // Will be set after user creation
  device_name: 'Test Device',
  device_type: 'android',
  device_id: 'device123'
};

// Test call log inputs
const testCallLogInput1: CreateCallLogInput = {
  device_id: 1, // Will be set after device creation
  phone_number: '+1234567890',
  contact_name: 'John Doe',
  call_type: 'outgoing',
  duration: 120,
  timestamp: new Date('2024-01-01T10:00:00Z')
};

const testCallLogInput2: CreateCallLogInput = {
  device_id: 1, // Will be set after device creation
  phone_number: '+0987654321',
  contact_name: 'Jane Smith',
  call_type: 'incoming',
  duration: 180,
  timestamp: new Date('2024-01-02T14:30:00Z')
};

const testCallLogInput3: CreateCallLogInput = {
  device_id: 1, // Will be set after device creation
  phone_number: '+1111111111',
  call_type: 'missed',
  duration: 0,
  timestamp: new Date('2024-01-03T09:15:00Z')
};

describe('getCallLogs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get call logs for device within date range', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        password_hash: 'hashed_password',
        role: testUserInput.role,
        full_name: testUserInput.full_name
      })
      .returning()
      .execute();

    const deviceResult = await db.insert(devicesTable)
      .values({
        ...testDeviceInput,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create call logs
    await db.insert(callLogsTable)
      .values([
        {
          ...testCallLogInput1,
          device_id: deviceResult[0].id
        },
        {
          ...testCallLogInput2,
          device_id: deviceResult[0].id
        },
        {
          ...testCallLogInput3,
          device_id: deviceResult[0].id
        }
      ])
      .execute();

    const input: GetCallLogsInput = {
      deviceId: deviceResult[0].id,
      startDate: new Date('2024-01-01T00:00:00Z'),
      endDate: new Date('2024-01-02T23:59:59Z')
    };

    const result = await getCallLogs(input);

    // Should return 2 call logs within date range
    expect(result).toHaveLength(2);
    
    // Verify first call log
    const firstCallLog = result.find(log => log.phone_number === '+1234567890');
    expect(firstCallLog).toBeDefined();
    expect(firstCallLog!.device_id).toEqual(deviceResult[0].id);
    expect(firstCallLog!.contact_name).toEqual('John Doe');
    expect(firstCallLog!.call_type).toEqual('outgoing');
    expect(firstCallLog!.duration).toEqual(120);
    expect(firstCallLog!.timestamp).toBeInstanceOf(Date);
    expect(firstCallLog!.id).toBeDefined();
    expect(firstCallLog!.created_at).toBeInstanceOf(Date);

    // Verify second call log
    const secondCallLog = result.find(log => log.phone_number === '+0987654321');
    expect(secondCallLog).toBeDefined();
    expect(secondCallLog!.contact_name).toEqual('Jane Smith');
    expect(secondCallLog!.call_type).toEqual('incoming');
    expect(secondCallLog!.duration).toEqual(180);
  });

  it('should return empty array when no call logs exist in date range', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        password_hash: 'hashed_password',
        role: testUserInput.role,
        full_name: testUserInput.full_name
      })
      .returning()
      .execute();

    const deviceResult = await db.insert(devicesTable)
      .values({
        ...testDeviceInput,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    const input: GetCallLogsInput = {
      deviceId: deviceResult[0].id,
      startDate: new Date('2024-01-01T00:00:00Z'),
      endDate: new Date('2024-01-02T23:59:59Z')
    };

    const result = await getCallLogs(input);

    expect(result).toHaveLength(0);
  });

  it('should filter call logs by device ID correctly', async () => {
    // Create two users and devices
    const userResult = await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        password_hash: 'hashed_password',
        role: testUserInput.role,
        full_name: testUserInput.full_name
      })
      .returning()
      .execute();

    const deviceResults = await db.insert(devicesTable)
      .values([
        {
          ...testDeviceInput,
          user_id: userResult[0].id,
          device_id: 'device1'
        },
        {
          ...testDeviceInput,
          user_id: userResult[0].id,
          device_id: 'device2',
          device_name: 'Second Device'
        }
      ])
      .returning()
      .execute();

    // Create call logs for both devices
    await db.insert(callLogsTable)
      .values([
        {
          ...testCallLogInput1,
          device_id: deviceResults[0].id
        },
        {
          ...testCallLogInput2,
          device_id: deviceResults[1].id
        }
      ])
      .execute();

    const input: GetCallLogsInput = {
      deviceId: deviceResults[0].id,
      startDate: new Date('2024-01-01T00:00:00Z'),
      endDate: new Date('2024-01-02T23:59:59Z')
    };

    const result = await getCallLogs(input);

    // Should only return call logs for the specified device
    expect(result).toHaveLength(1);
    expect(result[0].device_id).toEqual(deviceResults[0].id);
    expect(result[0].phone_number).toEqual('+1234567890');
  });

  it('should save call logs to database correctly', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        password_hash: 'hashed_password',
        role: testUserInput.role,
        full_name: testUserInput.full_name
      })
      .returning()
      .execute();

    const deviceResult = await db.insert(devicesTable)
      .values({
        ...testDeviceInput,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create call log
    await db.insert(callLogsTable)
      .values({
        ...testCallLogInput1,
        device_id: deviceResult[0].id
      })
      .execute();

    // Verify data was saved correctly
    const savedCallLogs = await db.select()
      .from(callLogsTable)
      .where(eq(callLogsTable.device_id, deviceResult[0].id))
      .execute();

    expect(savedCallLogs).toHaveLength(1);
    expect(savedCallLogs[0].phone_number).toEqual('+1234567890');
    expect(savedCallLogs[0].contact_name).toEqual('John Doe');
    expect(savedCallLogs[0].call_type).toEqual('outgoing');
    expect(savedCallLogs[0].duration).toEqual(120);
    expect(savedCallLogs[0].timestamp).toBeInstanceOf(Date);
    expect(savedCallLogs[0].created_at).toBeInstanceOf(Date);
  });
});
