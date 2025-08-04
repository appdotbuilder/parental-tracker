
import { db } from '../db';
import { emergencyAlertsTable } from '../db/schema';
import { type EmergencyAlert } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getEmergencyAlerts = async (deviceId: number): Promise<EmergencyAlert[]> => {
  try {
    const results = await db.select()
      .from(emergencyAlertsTable)
      .where(eq(emergencyAlertsTable.device_id, deviceId))
      .orderBy(desc(emergencyAlertsTable.created_at))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(alert => ({
      ...alert,
      latitude: alert.latitude ? parseFloat(alert.latitude) : null,
      longitude: alert.longitude ? parseFloat(alert.longitude) : null
    }));
  } catch (error) {
    console.error('Failed to get emergency alerts:', error);
    throw error;
  }
};
