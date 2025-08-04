
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { emergencyAlertsTable, devicesTable, usersTable } from '../db/schema';
import { type CreateEmergencyAlertInput } from '../schema';
import { createEmergencyAlert } from '../handlers/create_emergency_alert';
import { eq } from 'drizzle-orm';

describe('createEmergencyAlert', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testDeviceId: number;

  beforeEach(async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'child',
        full_name: 'Test Child'
      })
      .returning()
      .execute();

    // Create test device
    const deviceResult = await db.insert(devicesTable)
      .values({
        user_id: userResult[0].id,
        device_name: 'Test Device',
        device_type: 'android',
        device_id: 'test-device-123'
      })
      .returning()
      .execute();

    testDeviceId = deviceResult[0].id;
  });

  it('should create an emergency alert with location', async () => {
    const input: CreateEmergencyAlertInput = {
      device_id: testDeviceId,
      alert_type: 'panic_button',
      message: 'Emergency! Need help immediately!',
      latitude: 40.7128,
      longitude: -74.0060
    };

    const result = await createEmergencyAlert(input);

    expect(result.device_id).toEqual(testDeviceId);
    expect(result.alert_type).toEqual('panic_button');
    expect(result.message).toEqual('Emergency! Need help immediately!');
    expect(result.latitude).toEqual(40.7128);
    expect(result.longitude).toEqual(-74.0060);
    expect(result.is_resolved).toEqual(false);
    expect(result.resolved_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an emergency alert without location', async () => {
    const input: CreateEmergencyAlertInput = {
      device_id: testDeviceId,
      alert_type: 'app_alert',
      message: 'Suspicious app activity detected'
    };

    const result = await createEmergencyAlert(input);

    expect(result.device_id).toEqual(testDeviceId);
    expect(result.alert_type).toEqual('app_alert');
    expect(result.message).toEqual('Suspicious app activity detected');
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
    expect(result.is_resolved).toEqual(false);
    expect(result.resolved_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save alert to database', async () => {
    const input: CreateEmergencyAlertInput = {
      device_id: testDeviceId,
      alert_type: 'location_alert',
      message: 'Child has left safe zone',
      latitude: 40.7589,
      longitude: -73.9851
    };

    const result = await createEmergencyAlert(input);

    const alerts = await db.select()
      .from(emergencyAlertsTable)
      .where(eq(emergencyAlertsTable.id, result.id))
      .execute();

    expect(alerts).toHaveLength(1);
    expect(alerts[0].device_id).toEqual(testDeviceId);
    expect(alerts[0].alert_type).toEqual('location_alert');
    expect(alerts[0].message).toEqual('Child has left safe zone');
    expect(parseFloat(alerts[0].latitude!)).toEqual(40.7589);
    expect(parseFloat(alerts[0].longitude!)).toEqual(-73.9851);
    expect(alerts[0].is_resolved).toEqual(false);
    expect(alerts[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle all alert types correctly', async () => {
    const alertTypes = ['panic_button', 'location_alert', 'app_alert', 'custom'] as const;

    for (const alertType of alertTypes) {
      const input: CreateEmergencyAlertInput = {
        device_id: testDeviceId,
        alert_type: alertType,
        message: `Test ${alertType} message`
      };

      const result = await createEmergencyAlert(input);
      expect(result.alert_type).toEqual(alertType);
      expect(result.message).toEqual(`Test ${alertType} message`);
    }
  });

  it('should throw error for non-existent device', async () => {
    const input: CreateEmergencyAlertInput = {
      device_id: 99999,
      alert_type: 'panic_button',
      message: 'Emergency alert'
    };

    expect(createEmergencyAlert(input)).rejects.toThrow(/device.*not found/i);
  });

  it('should handle numeric location data correctly', async () => {
    const input: CreateEmergencyAlertInput = {
      device_id: testDeviceId,
      alert_type: 'panic_button',
      message: 'Emergency with precise location',
      latitude: 40.12345678,
      longitude: -74.87654321
    };

    const result = await createEmergencyAlert(input);

    expect(typeof result.latitude).toBe('number');
    expect(typeof result.longitude).toBe('number');
    expect(result.latitude).toEqual(40.12345678);
    expect(result.longitude).toEqual(-74.87654321);
  });
});
