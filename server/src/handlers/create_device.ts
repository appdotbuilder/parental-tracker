
import { db } from '../db';
import { devicesTable } from '../db/schema';
import { type CreateDeviceInput, type Device } from '../schema';

export const createDevice = async (input: CreateDeviceInput): Promise<Device> => {
  try {
    // Insert device record
    const result = await db.insert(devicesTable)
      .values({
        user_id: input.user_id,
        device_name: input.device_name,
        device_type: input.device_type,
        device_id: input.device_id
      })
      .returning()
      .execute();

    const device = result[0];
    return device;
  } catch (error) {
    console.error('Device creation failed:', error);
    throw error;
  }
};
