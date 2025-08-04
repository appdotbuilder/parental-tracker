
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, devicesTable, emergencyAlertsTable } from '../db/schema';
import { type CreateEmergencyAlertInput } from '../schema';
import { getEmergencyAlerts } from '../handlers/get_emergency_alerts';

describe('getEmergencyAlerts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no alerts exist', async () => {
    // Create user and device for testing
    const user = await db.insert(usersTable)
      .values({
        email: 'child@test.com',
        password_hash: 'hashedpassword',
        role: 'child',
        full_name: 'Test Child'
      })
      .returning()
      .execute();

    const device = await db.insert(devicesTable)
      .values({
        user_id: user[0].id,
        device_name: 'Test Device',
        device_type: 'android',
        device_id: 'test-device-123'
      })
      .returning()
      .execute();

    const result = await getEmergencyAlerts(device[0].id);
    
    expect(result).toEqual([]);
  });

  it('should return emergency alerts for device', async () => {
    // Create user and device
    const user = await db.insert(usersTable)
      .values({
        email: 'child@test.com',
        password_hash: 'hashedpassword',
        role: 'child',
        full_name: 'Test Child'
      })
      .returning()
      .execute();

    const device = await db.insert(devicesTable)
      .values({
        user_id: user[0].id,
        device_name: 'Test Device',
        device_type: 'android',
        device_id: 'test-device-123'
      })
      .returning()
      .execute();

    // Create emergency alerts
    const alert1 = await db.insert(emergencyAlertsTable)
      .values({
        device_id: device[0].id,
        alert_type: 'panic_button',
        message: 'Emergency help needed',
        latitude: '40.7128'.toString(),
        longitude: '-74.0060'.toString(),
        is_resolved: false
      })
      .returning()
      .execute();

    const alert2 = await db.insert(emergencyAlertsTable)
      .values({
        device_id: device[0].id,
        alert_type: 'location_alert',
        message: 'Child in restricted area',
        is_resolved: true,
        resolved_at: new Date()
      })
      .returning()
      .execute();

    const result = await getEmergencyAlerts(device[0].id);

    expect(result).toHaveLength(2);
    
    // Check first alert (should be most recent due to ordering)
    expect(result[0].device_id).toEqual(device[0].id);
    expect(result[0].alert_type).toEqual('location_alert');
    expect(result[0].message).toEqual('Child in restricted area');
    expect(result[0].is_resolved).toEqual(true);
    expect(result[0].latitude).toBeNull();
    expect(result[0].longitude).toBeNull();
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].resolved_at).toBeInstanceOf(Date);

    // Check second alert
    expect(result[1].device_id).toEqual(device[0].id);
    expect(result[1].alert_type).toEqual('panic_button');
    expect(result[1].message).toEqual('Emergency help needed');
    expect(result[1].is_resolved).toEqual(false);
    expect(result[1].latitude).toEqual(40.7128);
    expect(result[1].longitude).toEqual(-74.0060);
    expect(typeof result[1].latitude).toEqual('number');
    expect(typeof result[1].longitude).toEqual('number');
    expect(result[1].resolved_at).toBeNull();
  });

  it('should return alerts ordered by creation date (newest first)', async () => {
    // Create user and device
    const user = await db.insert(usersTable)
      .values({
        email: 'child@test.com',
        password_hash: 'hashedpassword',
        role: 'child',
        full_name: 'Test Child'
      })
      .returning()
      .execute();

    const device = await db.insert(devicesTable)
      .values({
        user_id: user[0].id,
        device_name: 'Test Device',
        device_type: 'android',
        device_id: 'test-device-123'
      })
      .returning()
      .execute();

    // Create multiple alerts with small delay to ensure different timestamps
    const alert1 = await db.insert(emergencyAlertsTable)
      .values({
        device_id: device[0].id,
        alert_type: 'panic_button',
        message: 'First alert',
        is_resolved: false
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const alert2 = await db.insert(emergencyAlertsTable)
      .values({
        device_id: device[0].id,
        alert_type: 'location_alert',
        message: 'Second alert',
        is_resolved: false
      })
      .returning()
      .execute();

    const result = await getEmergencyAlerts(device[0].id);

    expect(result).toHaveLength(2);
    expect(result[0].message).toEqual('Second alert'); // Most recent first
    expect(result[1].message).toEqual('First alert');
    expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime());
  });

  it('should only return alerts for specified device', async () => {
    // Create users and devices
    const user1 = await db.insert(usersTable)
      .values({
        email: 'child1@test.com',
        password_hash: 'hashedpassword',
        role: 'child',
        full_name: 'Test Child 1'
      })
      .returning()
      .execute();

    const user2 = await db.insert(usersTable)
      .values({
        email: 'child2@test.com',
        password_hash: 'hashedpassword',
        role: 'child',
        full_name: 'Test Child 2'
      })
      .returning()
      .execute();

    const device1 = await db.insert(devicesTable)
      .values({
        user_id: user1[0].id,
        device_name: 'Device 1',
        device_type: 'android',
        device_id: 'test-device-1'
      })
      .returning()
      .execute();

    const device2 = await db.insert(devicesTable)
      .values({
        user_id: user2[0].id,
        device_name: 'Device 2',
        device_type: 'ios',
        device_id: 'test-device-2'
      })
      .returning()
      .execute();

    // Create alerts for both devices
    await db.insert(emergencyAlertsTable)
      .values({
        device_id: device1[0].id,
        alert_type: 'panic_button',
        message: 'Alert for device 1',
        is_resolved: false
      })
      .execute();

    await db.insert(emergencyAlertsTable)
      .values({
        device_id: device2[0].id,
        alert_type: 'location_alert',
        message: 'Alert for device 2',
        is_resolved: false
      })
      .execute();

    const result = await getEmergencyAlerts(device1[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].device_id).toEqual(device1[0].id);
    expect(result[0].message).toEqual('Alert for device 1');
  });
});
