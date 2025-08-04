
import { db } from '../db';
import { devicesTable } from '../db/schema';
import { type Device } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserDevices = async (userId: number): Promise<Device[]> => {
  try {
    const results = await db.select()
      .from(devicesTable)
      .where(eq(devicesTable.user_id, userId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get user devices:', error);
    throw error;
  }
};
