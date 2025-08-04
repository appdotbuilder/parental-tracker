
import { db } from '../db';
import { activityReportsTable } from '../db/schema';
import { type GetActivityReportsInput, type ActivityReport } from '../schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export const getActivityReports = async (input: GetActivityReportsInput): Promise<ActivityReport[]> => {
  try {
    // Query activity reports for the device within the date range
    const results = await db.select()
      .from(activityReportsTable)
      .where(
        and(
          eq(activityReportsTable.device_id, input.deviceId),
          gte(activityReportsTable.report_date, input.startDate),
          lte(activityReportsTable.report_date, input.endDate)
        )
      )
      .orderBy(desc(activityReportsTable.report_date))
      .execute();

    // Transform results to match the expected schema
    return results.map(report => ({
      ...report,
      // JSON fields are already parsed by Drizzle
      most_used_apps: report.most_used_apps as Array<{
        app_name: string;
        usage_time: number;
      }>
    }));
  } catch (error) {
    console.error('Failed to fetch activity reports:', error);
    throw error;
  }
};
