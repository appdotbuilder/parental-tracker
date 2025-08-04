
import { db } from '../db';
import { locationTrackingTable } from '../db/schema';
import { type CreateLocationTrackingInput, type LocationTracking } from '../schema';

export const trackLocation = async (input: CreateLocationTrackingInput): Promise<LocationTracking> => {
  try {
    // Insert location tracking record
    const result = await db.insert(locationTrackingTable)
      .values({
        device_id: input.device_id,
        latitude: input.latitude.toString(), // Convert number to string for decimal column
        longitude: input.longitude.toString(), // Convert number to string for decimal column
        accuracy: input.accuracy ? input.accuracy.toString() : null, // Convert number to string for decimal column
        address: input.address || null,
        timestamp: new Date() // Use current timestamp for GPS recording
      })
      .returning()
      .execute();

    // Convert decimal fields back to numbers before returning
    const locationRecord = result[0];
    return {
      ...locationRecord,
      latitude: parseFloat(locationRecord.latitude), // Convert string back to number
      longitude: parseFloat(locationRecord.longitude), // Convert string back to number
      accuracy: locationRecord.accuracy ? parseFloat(locationRecord.accuracy) : null // Convert string back to number
    };
  } catch (error) {
    console.error('Location tracking failed:', error);
    throw error;
  }
};
