
import { db } from '../db';
import { callLogsTable } from '../db/schema';
import { type CreateCallLogInput, type CallLog } from '../schema';

export const logCall = async (input: CreateCallLogInput): Promise<CallLog> => {
  try {
    // Insert call log record
    const result = await db.insert(callLogsTable)
      .values({
        device_id: input.device_id,
        phone_number: input.phone_number,
        contact_name: input.contact_name || null,
        call_type: input.call_type,
        duration: input.duration,
        timestamp: input.timestamp
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Call log creation failed:', error);
    throw error;
  }
};
