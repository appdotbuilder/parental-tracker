
import { db } from '../db';
import { locationTrackingTable } from '../db/schema';
import { type GetLocationHistoryInput, type LocationTracking } from '../schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export const getLocationHistory = async (input: GetLocationHistoryInput): Promise<LocationTracking[]> => {
  try {
    // Build query with device ID and date range filters
    const results = await db.select()
      .from(locationTrackingTable)
      .where(and(
        eq(locationTrackingTable.device_id, input.deviceId),
        gte(locationTrackingTable.timestamp, input.startDate),
        lte(locationTrackingTable.timestamp, input.endDate)
      ))
      .orderBy(locationTrackingTable.timestamp)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(location => ({
      ...location,
      latitude: parseFloat(location.latitude),
      longitude: parseFloat(location.longitude),
      accuracy: location.accuracy ? parseFloat(location.accuracy) : null
    }));
  } catch (error) {
    console.error('Failed to get location history:', error);
    throw error;
  }
};
