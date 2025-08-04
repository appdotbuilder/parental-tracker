
import { db } from '../db';
import { webFiltersTable } from '../db/schema';
import { type WebFilter } from '../schema';
import { eq } from 'drizzle-orm';

export const getWebFilters = async (deviceId: number): Promise<WebFilter[]> => {
  try {
    const results = await db.select()
      .from(webFiltersTable)
      .where(eq(webFiltersTable.device_id, deviceId))
      .execute();

    return results.map(filter => ({
      ...filter,
      // Parse JSONB fields to arrays
      blocked_domains: filter.blocked_domains as string[],
      blocked_categories: filter.blocked_categories as string[],
      allowed_domains: filter.allowed_domains as string[]
    }));
  } catch (error) {
    console.error('Failed to get web filters:', error);
    throw error;
  }
};
