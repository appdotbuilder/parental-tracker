
import { db } from '../db';
import { 
  activityReportsTable, 
  appUsageTable, 
  locationTrackingTable, 
  callLogsTable, 
  smsLogsTable, 
  webFiltersTable 
} from '../db/schema';
import { type GetActivityReportInput, type ActivityReport } from '../schema';
import { eq, and, gte, lte, desc, sum, count } from 'drizzle-orm';

export const generateActivityReport = async (input: GetActivityReportInput): Promise<ActivityReport> => {
  try {
    const { device_id, start_date, end_date } = input;

    // Query total screen time from app usage
    const screenTimeQuery = await db
      .select({
        total: sum(appUsageTable.usage_duration)
      })
      .from(appUsageTable)
      .where(
        and(
          eq(appUsageTable.device_id, device_id),
          gte(appUsageTable.start_time, start_date),
          lte(appUsageTable.start_time, end_date)
        )
      )
      .execute();

    const totalScreenTime = parseInt(screenTimeQuery[0]?.total || '0');

    // Query most used apps
    const mostUsedAppsQuery = await db
      .select({
        app_name: appUsageTable.app_name,
        total_usage: sum(appUsageTable.usage_duration)
      })
      .from(appUsageTable)
      .where(
        and(
          eq(appUsageTable.device_id, device_id),
          gte(appUsageTable.start_time, start_date),
          lte(appUsageTable.start_time, end_date)
        )
      )
      .groupBy(appUsageTable.app_name)
      .orderBy(desc(sum(appUsageTable.usage_duration)))
      .limit(10)
      .execute();

    const mostUsedApps = mostUsedAppsQuery.map(app => ({
      app_name: app.app_name,
      usage_time: parseInt(app.total_usage || '0')
    }));

    // Query unique locations visited
    const locationsQuery = await db
      .select({
        count: count()
      })
      .from(locationTrackingTable)
      .where(
        and(
          eq(locationTrackingTable.device_id, device_id),
          gte(locationTrackingTable.timestamp, start_date),
          lte(locationTrackingTable.timestamp, end_date)
        )
      )
      .execute();

    const locationsVisited = locationsQuery[0]?.count || 0;

    // Query calls made (outgoing only)
    const callsQuery = await db
      .select({
        count: count()
      })
      .from(callLogsTable)
      .where(
        and(
          eq(callLogsTable.device_id, device_id),
          eq(callLogsTable.call_type, 'outgoing'),
          gte(callLogsTable.timestamp, start_date),
          lte(callLogsTable.timestamp, end_date)
        )
      )
      .execute();

    const callsMade = callsQuery[0]?.count || 0;

    // Query SMS sent
    const smsQuery = await db
      .select({
        count: count()
      })
      .from(smsLogsTable)
      .where(
        and(
          eq(smsLogsTable.device_id, device_id),
          eq(smsLogsTable.message_type, 'sent'),
          gte(smsLogsTable.timestamp, start_date),
          lte(smsLogsTable.timestamp, end_date)
        )
      )
      .execute();

    const smsSent = smsQuery[0]?.count || 0;

    // Query active web filters (as proxy for websites blocked)
    const webFiltersQuery = await db
      .select({
        blocked_domains: webFiltersTable.blocked_domains
      })
      .from(webFiltersTable)
      .where(
        and(
          eq(webFiltersTable.device_id, device_id),
          eq(webFiltersTable.is_active, true)
        )
      )
      .execute();

    let websitesBlocked = 0;
    webFiltersQuery.forEach(filter => {
      if (filter.blocked_domains && Array.isArray(filter.blocked_domains)) {
        websitesBlocked += filter.blocked_domains.length;
      }
    });

    // Insert the generated report
    const result = await db.insert(activityReportsTable)
      .values({
        device_id,
        report_date: start_date,
        total_screen_time: totalScreenTime,
        most_used_apps: mostUsedApps,
        locations_visited: locationsVisited,
        calls_made: callsMade,
        sms_sent: smsSent,
        websites_blocked: websitesBlocked
      })
      .returning()
      .execute();

    const report = result[0];
    
    // Cast the most_used_apps field to the correct type
    return {
      ...report,
      most_used_apps: report.most_used_apps as { app_name: string; usage_time: number; }[]
    };
  } catch (error) {
    console.error('Activity report generation failed:', error);
    throw error;
  }
};
