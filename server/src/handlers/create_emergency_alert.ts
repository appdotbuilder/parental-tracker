
import { db } from '../db';
import { emergencyAlertsTable, devicesTable } from '../db/schema';
import { type CreateEmergencyAlertInput, type EmergencyAlert } from '../schema';
import { eq } from 'drizzle-orm';

export const createEmergencyAlert = async (input: CreateEmergencyAlertInput): Promise<EmergencyAlert> => {
  try {
    // Verify device exists
    const device = await db.select()
      .from(devicesTable)
      .where(eq(devicesTable.id, input.device_id))
      .execute();

    if (device.length === 0) {
      throw new Error(`Device with id ${input.device_id} not found`);
    }

    // Insert emergency alert record
    const result = await db.insert(emergencyAlertsTable)
      .values({
        device_id: input.device_id,
        alert_type: input.alert_type,
        message: input.message,
        latitude: input.latitude ? input.latitude.toString() : null,
        longitude: input.longitude ? input.longitude.toString() : null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const alert = result[0];
    return {
      ...alert,
      latitude: alert.latitude ? parseFloat(alert.latitude) : null,
      longitude: alert.longitude ? parseFloat(alert.longitude) : null
    };
  } catch (error) {
    console.error('Emergency alert creation failed:', error);
    throw error;
  }
};
