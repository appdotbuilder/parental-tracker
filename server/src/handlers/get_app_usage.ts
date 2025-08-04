
import { db } from '../db';
import { appUsageTable } from '../db/schema';
import { type GetAppUsageInput, type AppUsage } from '../schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export const getAppUsage = async (input: GetAppUsageInput): Promise<AppUsage[]> => {
  try {
    // Query app usage records within the date range for the specified device
    const results = await db.select()
      .from(appUsageTable)
      .where(
        and(
          eq(appUsageTable.device_id, input.deviceId),
          gte(appUsageTable.start_time, input.startDate),
          lte(appUsageTable.start_time, input.endDate)
        )
      )
      .execute();

    // Return results - no numeric conversions needed as all fields are integers or dates
    return results;
  } catch (error) {
    console.error('Get app usage failed:', error);
    throw error;
  }
};
