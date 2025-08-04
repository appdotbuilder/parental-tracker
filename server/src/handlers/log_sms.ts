
import { db } from '../db';
import { smsLogsTable } from '../db/schema';
import { type CreateSmsLogInput, type SmsLog } from '../schema';

export const logSms = async (input: CreateSmsLogInput): Promise<SmsLog> => {
  try {
    // Insert SMS log record
    const result = await db.insert(smsLogsTable)
      .values({
        device_id: input.device_id,
        phone_number: input.phone_number,
        contact_name: input.contact_name || null,
        message_type: input.message_type,
        message_length: input.message_length,
        timestamp: input.timestamp
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('SMS log creation failed:', error);
    throw error;
  }
};
