
import { db } from '../db';
import { emergencyAlertsTable } from '../db/schema';
import { type EmergencyAlert, type ResolveEmergencyAlertInput } from '../schema';
import { eq } from 'drizzle-orm';

export const resolveEmergencyAlert = async (input: ResolveEmergencyAlertInput): Promise<EmergencyAlert> => {
  try {
    // Update the alert to mark it as resolved
    const result = await db.update(emergencyAlertsTable)
      .set({
        is_resolved: true,
        resolved_at: new Date()
      })
      .where(eq(emergencyAlertsTable.id, input.alertId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Emergency alert with ID ${input.alertId} not found`);
    }

    const alert = result[0];
    
    // Convert numeric fields to numbers for return
    return {
      ...alert,
      latitude: alert.latitude ? parseFloat(alert.latitude) : null,
      longitude: alert.longitude ? parseFloat(alert.longitude) : null
    };
  } catch (error) {
    console.error('Emergency alert resolution failed:', error);
    throw error;
  }
};
