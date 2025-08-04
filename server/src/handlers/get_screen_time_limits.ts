
import { db } from '../db';
import { screenTimeLimitsTable } from '../db/schema';
import { type GetScreenTimeLimitsInput, type ScreenTimeLimit } from '../schema';
import { eq } from 'drizzle-orm';

export const getScreenTimeLimits = async (input: GetScreenTimeLimitsInput): Promise<ScreenTimeLimit[]> => {
  try {
    const results = await db.select()
      .from(screenTimeLimitsTable)
      .where(eq(screenTimeLimitsTable.device_id, input.deviceId))
      .execute();

    return results.map(limit => ({
      ...limit,
      app_specific_limits: limit.app_specific_limits as Record<string, number> | null
    }));
  } catch (error) {
    console.error('Screen time limits retrieval failed:', error);
    throw error;
  }
};
