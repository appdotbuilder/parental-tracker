
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, devicesTable, emergencyAlertsTable } from '../db/schema';
import { type CreateUserInput, type CreateDeviceInput, type CreateEmergencyAlertInput } from '../schema';
import { resolveEmergencyAlert } from '../handlers/resolve_emergency_alert';
import { eq } from 'drizzle-orm';

describe('resolveEmergencyAlert', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should resolve an emergency alert', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'child@test.com',
        password_hash: 'hashedpassword',
        role: 'child',
        full_name: 'Child User'
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

    const alertResult = await db.insert(emergencyAlertsTable)
      .values({
        device_id: deviceResult[0].id,
        alert_type: 'panic_button',
        message: 'Emergency help needed!',
        latitude: '40.7128',
        longitude: '-74.0060'
      })
      .returning()
      .execute();

    const result = await resolveEmergencyAlert({ alertId: alertResult[0].id });

    // Verify the alert is marked as resolved
    expect(result.id).toEqual(alertResult[0].id);
    expect(result.is_resolved).toBe(true);
    expect(result.resolved_at).toBeInstanceOf(Date);
    expect(result.alert_type).toEqual('panic_button');
    expect(result.message).toEqual('Emergency help needed!');
    expect(result.latitude).toEqual(40.7128);
    expect(result.longitude).toEqual(-74.0060);
    expect(typeof result.latitude).toBe('number');
    expect(typeof result.longitude).toBe('number');
  });

  it('should update the alert in database', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'child@test.com',
        password_hash: 'hashedpassword',
        role: 'child',
        full_name: 'Child User'
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

    const alertResult = await db.insert(emergencyAlertsTable)
      .values({
        device_id: deviceResult[0].id,
        alert_type: 'location_alert',
        message: 'Child is in restricted area',
        is_resolved: false
      })
      .returning()
      .execute();

    await resolveEmergencyAlert({ alertId: alertResult[0].id });

    // Query the database to verify the update
    const alerts = await db.select()
      .from(emergencyAlertsTable)
      .where(eq(emergencyAlertsTable.id, alertResult[0].id))
      .execute();

    expect(alerts).toHaveLength(1);
    expect(alerts[0].is_resolved).toBe(true);
    expect(alerts[0].resolved_at).toBeInstanceOf(Date);
  });

  it('should handle alerts without location data', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'child@test.com',
        password_hash: 'hashedpassword',
        role: 'child',
        full_name: 'Child User'
      })
      .returning()
      .execute();

    const deviceResult = await db.insert(devicesTable)
      .values({
        user_id: userResult[0].id,
        device_name: 'Test Device',
        device_type: 'ios',
        device_id: 'test-device-456'
      })
      .returning()
      .execute();

    const alertResult = await db.insert(emergencyAlertsTable)
      .values({
        device_id: deviceResult[0].id,
        alert_type: 'app_alert',
        message: 'Inappropriate app usage detected'
      })
      .returning()
      .execute();

    const result = await resolveEmergencyAlert({ alertId: alertResult[0].id });

    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
    expect(result.is_resolved).toBe(true);
    expect(result.resolved_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent alert', async () => {
    await expect(resolveEmergencyAlert({ alertId: 999 }))
      .rejects.toThrow(/Emergency alert with ID 999 not found/i);
  });
});
