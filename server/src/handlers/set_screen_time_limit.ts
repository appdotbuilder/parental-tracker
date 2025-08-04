
import { db } from '../db';
import { screenTimeLimitsTable, devicesTable } from '../db/schema';
import { type CreateScreenTimeLimitInput, type ScreenTimeLimit } from '../schema';
import { eq } from 'drizzle-orm';

export const setScreenTimeLimit = async (input: CreateScreenTimeLimitInput): Promise<ScreenTimeLimit> => {
  try {
    // Verify device exists
    const device = await db.select()
      .from(devicesTable)
      .where(eq(devicesTable.id, input.device_id))
      .execute();

    if (device.length === 0) {
      throw new Error(`Device with id ${input.device_id} not found`);
    }

    // Insert screen time limit record
    const result = await db.insert(screenTimeLimitsTable)
      .values({
        device_id: input.device_id,
        daily_limit: input.daily_limit,
        app_specific_limits: input.app_specific_limits || null
      })
      .returning()
      .execute();

    const screenTimeLimit = result[0];
    return {
      ...screenTimeLimit,
      app_specific_limits: screenTimeLimit.app_specific_limits as Record<string, number> | null
    };
  } catch (error) {
    console.error('Screen time limit creation failed:', error);
    throw error;
  }
};
