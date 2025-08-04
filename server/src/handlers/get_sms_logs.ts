
import { db } from '../db';
import { smsLogsTable } from '../db/schema';
import { type GetSmsLogsInput, type SmsLog } from '../schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export const getSmsLogs = async (input: GetSmsLogsInput): Promise<SmsLog[]> => {
  try {
    const results = await db.select()
      .from(smsLogsTable)
      .where(
        and(
          eq(smsLogsTable.device_id, input.deviceId),
          gte(smsLogsTable.timestamp, input.startDate),
          lte(smsLogsTable.timestamp, input.endDate)
        )
      )
      .orderBy(smsLogsTable.timestamp)
      .execute();

    return results.map(log => ({
      ...log,
      // No numeric conversions needed - all fields are already correct types
    }));
  } catch (error) {
    console.error('Failed to fetch SMS logs:', error);
    throw error;
  }
};
