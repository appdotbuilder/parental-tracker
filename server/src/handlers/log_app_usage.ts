
import { db } from '../db';
import { appUsageTable } from '../db/schema';
import { type CreateAppUsageInput, type AppUsage } from '../schema';

export const logAppUsage = async (input: CreateAppUsageInput): Promise<AppUsage> => {
  try {
    // Insert app usage record
    const result = await db.insert(appUsageTable)
      .values({
        device_id: input.device_id,
        app_name: input.app_name,
        package_name: input.package_name,
        usage_duration: input.usage_duration,
        start_time: input.start_time,
        end_time: input.end_time || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('App usage logging failed:', error);
    throw error;
  }
};
