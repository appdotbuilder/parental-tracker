
import { db } from '../db';
import { webFiltersTable, devicesTable } from '../db/schema';
import { type CreateWebFilterInput, type WebFilter } from '../schema';
import { eq } from 'drizzle-orm';

export const setWebFilter = async (input: CreateWebFilterInput): Promise<WebFilter> => {
  try {
    // Verify device exists
    const device = await db.select()
      .from(devicesTable)
      .where(eq(devicesTable.id, input.device_id))
      .execute();

    if (device.length === 0) {
      throw new Error(`Device with id ${input.device_id} not found`);
    }

    // Insert web filter record
    const result = await db.insert(webFiltersTable)
      .values({
        device_id: input.device_id,
        blocked_domains: input.blocked_domains || [],
        blocked_categories: input.blocked_categories || [],
        allowed_domains: input.allowed_domains || []
      })
      .returning()
      .execute();

    // Convert JSONB fields back to arrays for return type
    const webFilter = result[0];
    return {
      ...webFilter,
      blocked_domains: webFilter.blocked_domains as string[],
      blocked_categories: webFilter.blocked_categories as string[],
      allowed_domains: webFilter.allowed_domains as string[]
    };
  } catch (error) {
    console.error('Web filter creation failed:', error);
    throw error;
  }
};
