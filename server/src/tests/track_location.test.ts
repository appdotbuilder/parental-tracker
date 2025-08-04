
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, devicesTable, locationTrackingTable } from '../db/schema';
import { type CreateLocationTrackingInput } from '../schema';
import { trackLocation } from '../handlers/track_location';
import { eq } from 'drizzle-orm';

describe('trackLocation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should track location', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'child@test.com',
        password_hash: 'hashedpassword',
        role: 'child',
        full_name: 'Child User'
      })
      .returning()
      .execute();

    // Create prerequisite device
    const deviceResult = await db.insert(devicesTable)
      .values({
        user_id: userResult[0].id,
        device_name: 'Child Phone',
        device_type: 'android',
        device_id: 'device123'
      })
      .returning()
      .execute();

    const testInput: CreateLocationTrackingInput = {
      device_id: deviceResult[0].id,
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10.5,
      address: '123 Main St, New York, NY'
    };

    const result = await trackLocation(testInput);

    // Basic field validation
    expect(result.device_id).toEqual(deviceResult[0].id);
    expect(result.latitude).toEqual(40.7128);
    expect(typeof result.latitude).toBe('number');
    expect(result.longitude).toEqual(-74.0060);
    expect(typeof result.longitude).toBe('number');
    expect(result.accuracy).toEqual(10.5);
    expect(typeof result.accuracy).toBe('number');
    expect(result.address).toEqual('123 Main St, New York, NY');
    expect(result.id).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should track location without optional fields', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'child2@test.com',
        password_hash: 'hashedpassword',
        role: 'child',
        full_name: 'Child User 2'
      })
      .returning()
      .execute();

    // Create prerequisite device
    const deviceResult = await db.insert(devicesTable)
      .values({
        user_id: userResult[0].id,
        device_name: 'Child Tablet',
        device_type: 'ios',
        device_id: 'device456'
      })
      .returning()
      .execute();

    const testInput: CreateLocationTrackingInput = {
      device_id: deviceResult[0].id,
      latitude: 34.0522,
      longitude: -118.2437
    };

    const result = await trackLocation(testInput);

    // Validate required fields
    expect(result.device_id).toEqual(deviceResult[0].id);
    expect(result.latitude).toEqual(34.0522);
    expect(result.longitude).toEqual(-118.2437);
    expect(result.accuracy).toBeNull();
    expect(result.address).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save location to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'child3@test.com',
        password_hash: 'hashedpassword',
        role: 'child',
        full_name: 'Child User 3'
      })
      .returning()
      .execute();

    // Create prerequisite device
    const deviceResult = await db.insert(devicesTable)
      .values({
        user_id: userResult[0].id,
        device_name: 'Child Device',
        device_type: 'android',
        device_id: 'device789'
      })
      .returning()
      .execute();

    const testInput: CreateLocationTrackingInput = {
      device_id: deviceResult[0].id,
      latitude: 51.5074,
      longitude: -0.1278,
      accuracy: 5.0,
      address: 'London, UK'
    };

    const result = await trackLocation(testInput);

    // Query using proper drizzle syntax
    const locations = await db.select()
      .from(locationTrackingTable)
      .where(eq(locationTrackingTable.id, result.id))
      .execute();

    expect(locations).toHaveLength(1);
    expect(locations[0].device_id).toEqual(deviceResult[0].id);
    expect(parseFloat(locations[0].latitude)).toEqual(51.5074);
    expect(parseFloat(locations[0].longitude)).toEqual(-0.1278);
    expect(parseFloat(locations[0].accuracy!)).toEqual(5.0);
    expect(locations[0].address).toEqual('London, UK');
    expect(locations[0].timestamp).toBeInstanceOf(Date);
    expect(locations[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle precision within database limits', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'child4@test.com',
        password_hash: 'hashedpassword',
        role: 'child',
        full_name: 'Child User 4'
      })
      .returning()
      .execute();

    // Create prerequisite device
    const deviceResult = await db.insert(devicesTable)
      .values({
        user_id: userResult[0].id,
        device_name: 'Precise Device',
        device_type: 'ios',
        device_id: 'device_precise123'
      })
      .returning()
      .execute();

    const testInput: CreateLocationTrackingInput = {
      device_id: deviceResult[0].id,
      latitude: 37.42342342,
      longitude: -122.08424242,
      accuracy: 1.23 // Use precision that fits within decimal(8,2) limits
    };

    const result = await trackLocation(testInput);

    // Validate coordinates are preserved within database precision limits
    expect(result.latitude).toEqual(37.42342342);
    expect(result.longitude).toEqual(-122.08424242);
    expect(result.accuracy).toEqual(1.23);
  });

  it('should fail with invalid device_id', async () => {
    const testInput: CreateLocationTrackingInput = {
      device_id: 99999, // Non-existent device
      latitude: 40.7128,
      longitude: -74.0060
    };

    await expect(trackLocation(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});
