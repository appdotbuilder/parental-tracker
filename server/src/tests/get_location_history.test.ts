
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, devicesTable, locationTrackingTable } from '../db/schema';
import { type GetLocationHistoryInput } from '../schema';
import { getLocationHistory } from '../handlers/get_location_history';

// Test setup data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  role: 'child' as const,
  full_name: 'Test User'
};

const testDevice = {
  device_name: 'Test Device',
  device_type: 'android' as const,
  device_id: 'test-device-123'
};

describe('getLocationHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get location history for a device within date range', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create device
    const deviceResult = await db.insert(devicesTable)
      .values({
        ...testDevice,
        user_id: userId
      })
      .returning()
      .execute();
    const deviceId = deviceResult[0].id;

    // Create location tracking records
    const baseDate = new Date('2024-01-15T10:00:00Z');
    const locations = [
      {
        device_id: deviceId,
        latitude: '40.7128',
        longitude: '-74.0060',
        accuracy: '10.5',
        address: 'New York, NY',
        timestamp: new Date('2024-01-15T09:00:00Z')
      },
      {
        device_id: deviceId,
        latitude: '40.7589',
        longitude: '-73.9851',
        accuracy: '15.2',
        address: 'Times Square, NY',
        timestamp: new Date('2024-01-15T12:00:00Z')
      },
      {
        device_id: deviceId,
        latitude: '40.6892',
        longitude: '-74.0445',
        accuracy: null,
        address: 'Statue of Liberty, NY',
        timestamp: new Date('2024-01-16T14:00:00Z')
      }
    ];

    await db.insert(locationTrackingTable)
      .values(locations)
      .execute();

    const input: GetLocationHistoryInput = {
      deviceId,
      startDate: new Date('2024-01-15T00:00:00Z'),
      endDate: new Date('2024-01-15T23:59:59Z')
    };

    const result = await getLocationHistory(input);

    // Should return 2 locations within the date range
    expect(result).toHaveLength(2);

    // Verify first location
    expect(result[0].device_id).toEqual(deviceId);
    expect(result[0].latitude).toEqual(40.7128);
    expect(result[0].longitude).toEqual(-74.0060);
    expect(result[0].accuracy).toEqual(10.5);
    expect(result[0].address).toEqual('New York, NY');
    expect(result[0].timestamp).toBeInstanceOf(Date);

    // Verify second location
    expect(result[1].device_id).toEqual(deviceId);
    expect(result[1].latitude).toEqual(40.7589);
    expect(result[1].longitude).toEqual(-73.9851);
    expect(result[1].accuracy).toEqual(15.2);
    expect(result[1].address).toEqual('Times Square, NY');

    // Verify numeric types
    expect(typeof result[0].latitude).toBe('number');
    expect(typeof result[0].longitude).toBe('number');
    expect(typeof result[0].accuracy).toBe('number');
  });

  it('should handle null accuracy values correctly', async () => {
    // Create user and device
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const deviceResult = await db.insert(devicesTable)
      .values({
        ...testDevice,
        user_id: userId
      })
      .returning()
      .execute();
    const deviceId = deviceResult[0].id;

    // Create location with null accuracy
    await db.insert(locationTrackingTable)
      .values({
        device_id: deviceId,
        latitude: '40.7128',
        longitude: '-74.0060',
        accuracy: null,
        address: 'Test Location',
        timestamp: new Date('2024-01-15T12:00:00Z')
      })
      .execute();

    const input: GetLocationHistoryInput = {
      deviceId,
      startDate: new Date('2024-01-15T00:00:00Z'),
      endDate: new Date('2024-01-15T23:59:59Z')
    };

    const result = await getLocationHistory(input);

    expect(result).toHaveLength(1);
    expect(result[0].accuracy).toBeNull();
    expect(typeof result[0].latitude).toBe('number');
    expect(typeof result[0].longitude).toBe('number');
  });

  it('should return empty array when no locations found', async () => {
    // Create user and device
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const deviceResult = await db.insert(devicesTable)
      .values({
        ...testDevice,
        user_id: userId
      })
      .returning()
      .execute();
    const deviceId = deviceResult[0].id;

    const input: GetLocationHistoryInput = {
      deviceId,
      startDate: new Date('2024-01-15T00:00:00Z'),
      endDate: new Date('2024-01-15T23:59:59Z')
    };

    const result = await getLocationHistory(input);

    expect(result).toHaveLength(0);
  });

  it('should return locations ordered by timestamp', async () => {
    // Create user and device
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const deviceResult = await db.insert(devicesTable)
      .values({
        ...testDevice,
        user_id: userId
      })
      .returning()
      .execute();
    const deviceId = deviceResult[0].id;

    // Create locations in non-chronological order
    const locations = [
      {
        device_id: deviceId,
        latitude: '40.7589',
        longitude: '-73.9851',
        accuracy: '15.2',
        address: 'Times Square, NY',
        timestamp: new Date('2024-01-15T15:00:00Z')
      },
      {
        device_id: deviceId,
        latitude: '40.7128',
        longitude: '-74.0060',
        accuracy: '10.5',
        address: 'New York, NY',
        timestamp: new Date('2024-01-15T10:00:00Z')
      },
      {
        device_id: deviceId,
        latitude: '40.6892',
        longitude: '-74.0445',
        accuracy: '20.0',
        address: 'Statue of Liberty, NY',
        timestamp: new Date('2024-01-15T20:00:00Z')
      }
    ];

    await db.insert(locationTrackingTable)
      .values(locations)
      .execute();

    const input: GetLocationHistoryInput = {
      deviceId,
      startDate: new Date('2024-01-15T00:00:00Z'),
      endDate: new Date('2024-01-15T23:59:59Z')
    };

    const result = await getLocationHistory(input);

    expect(result).toHaveLength(3);
    
    // Verify chronological order
    expect(result[0].timestamp.getTime()).toBeLessThan(result[1].timestamp.getTime());
    expect(result[1].timestamp.getTime()).toBeLessThan(result[2].timestamp.getTime());
    
    // Verify correct order
    expect(result[0].address).toEqual('New York, NY');
    expect(result[1].address).toEqual('Times Square, NY');
    expect(result[2].address).toEqual('Statue of Liberty, NY');
  });
});
