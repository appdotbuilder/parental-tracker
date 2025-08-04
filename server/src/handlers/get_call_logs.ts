
import { db } from '../db';
import { callLogsTable } from '../db/schema';
import { type CallLog, type GetCallLogsInput } from '../schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export const getCallLogs = async (input: GetCallLogsInput): Promise<CallLog[]> => {
  try {
    // Build query with date range filter
    const results = await db.select()
      .from(callLogsTable)
      .where(
        and(
          eq(callLogsTable.device_id, input.deviceId),
          gte(callLogsTable.timestamp, input.startDate),
          lte(callLogsTable.timestamp, input.endDate)
        )
      )
      .execute();

    // Return call logs with proper type conversion
    return results.map(callLog => ({
      ...callLog,
      // No numeric fields need conversion for call logs
    }));
  } catch (error) {
    console.error('Get call logs failed:', error);
    throw error;
  }
};
