
import { serial, text, pgTable, timestamp, integer, boolean, decimal, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['parent', 'child']);
export const deviceTypeEnum = pgEnum('device_type', ['android', 'ios']);
export const callTypeEnum = pgEnum('call_type', ['incoming', 'outgoing', 'missed']);
export const messageTypeEnum = pgEnum('message_type', ['received', 'sent']);
export const alertTypeEnum = pgEnum('alert_type', ['panic_button', 'location_alert', 'app_alert', 'custom']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  full_name: text('full_name').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Family relationships table
export const familyRelationshipsTable = pgTable('family_relationships', {
  id: serial('id').primaryKey(),
  parent_id: integer('parent_id').notNull().references(() => usersTable.id),
  child_id: integer('child_id').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Devices table
export const devicesTable = pgTable('devices', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  device_name: text('device_name').notNull(),
  device_type: deviceTypeEnum('device_type').notNull(),
  device_id: text('device_id').notNull().unique(),
  is_active: boolean('is_active').default(true).notNull(),
  last_seen: timestamp('last_seen'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Location tracking table
export const locationTrackingTable = pgTable('location_tracking', {
  id: serial('id').primaryKey(),
  device_id: integer('device_id').notNull().references(() => devicesTable.id),
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
  accuracy: decimal('accuracy', { precision: 8, scale: 2 }),
  address: text('address'),
  timestamp: timestamp('timestamp').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// App usage monitoring table
export const appUsageTable = pgTable('app_usage', {
  id: serial('id').primaryKey(),
  device_id: integer('device_id').notNull().references(() => devicesTable.id),
  app_name: text('app_name').notNull(),
  package_name: text('package_name').notNull(),
  usage_duration: integer('usage_duration').notNull(),
  start_time: timestamp('start_time').notNull(),
  end_time: timestamp('end_time'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Screen time limits table
export const screenTimeLimitsTable = pgTable('screen_time_limits', {
  id: serial('id').primaryKey(),
  device_id: integer('device_id').notNull().references(() => devicesTable.id),
  daily_limit: integer('daily_limit').notNull(),
  app_specific_limits: jsonb('app_specific_limits'),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Web content filtering table
export const webFiltersTable = pgTable('web_filters', {
  id: serial('id').primaryKey(),
  device_id: integer('device_id').notNull().references(() => devicesTable.id),
  blocked_domains: jsonb('blocked_domains').notNull(),
  blocked_categories: jsonb('blocked_categories').notNull(),
  allowed_domains: jsonb('allowed_domains').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Call logs table
export const callLogsTable = pgTable('call_logs', {
  id: serial('id').primaryKey(),
  device_id: integer('device_id').notNull().references(() => devicesTable.id),
  phone_number: text('phone_number').notNull(),
  contact_name: text('contact_name'),
  call_type: callTypeEnum('call_type').notNull(),
  duration: integer('duration').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// SMS logs table
export const smsLogsTable = pgTable('sms_logs', {
  id: serial('id').primaryKey(),
  device_id: integer('device_id').notNull().references(() => devicesTable.id),
  phone_number: text('phone_number').notNull(),
  contact_name: text('contact_name'),
  message_type: messageTypeEnum('message_type').notNull(),
  message_length: integer('message_length').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Emergency alerts table
export const emergencyAlertsTable = pgTable('emergency_alerts', {
  id: serial('id').primaryKey(),
  device_id: integer('device_id').notNull().references(() => devicesTable.id),
  alert_type: alertTypeEnum('alert_type').notNull(),
  message: text('message').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  is_resolved: boolean('is_resolved').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  resolved_at: timestamp('resolved_at')
});

// Activity reports table
export const activityReportsTable = pgTable('activity_reports', {
  id: serial('id').primaryKey(),
  device_id: integer('device_id').notNull().references(() => devicesTable.id),
  report_date: timestamp('report_date').notNull(),
  total_screen_time: integer('total_screen_time').notNull(),
  most_used_apps: jsonb('most_used_apps').notNull(),
  locations_visited: integer('locations_visited').notNull(),
  calls_made: integer('calls_made').notNull(),
  sms_sent: integer('sms_sent').notNull(),
  websites_blocked: integer('websites_blocked').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  devices: many(devicesTable),
  childRelationships: many(familyRelationshipsTable, { relationName: 'child' }),
  parentRelationships: many(familyRelationshipsTable, { relationName: 'parent' })
}));

export const devicesRelations = relations(devicesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [devicesTable.user_id],
    references: [usersTable.id]
  }),
  locationTracking: many(locationTrackingTable),
  appUsage: many(appUsageTable),
  screenTimeLimits: many(screenTimeLimitsTable),
  webFilters: many(webFiltersTable),
  callLogs: many(callLogsTable),
  smsLogs: many(smsLogsTable),
  emergencyAlerts: many(emergencyAlertsTable),
  activityReports: many(activityReportsTable)
}));

export const familyRelationshipsRelations = relations(familyRelationshipsTable, ({ one }) => ({
  parent: one(usersTable, {
    fields: [familyRelationshipsTable.parent_id],
    references: [usersTable.id],
    relationName: 'parent'
  }),
  child: one(usersTable, {
    fields: [familyRelationshipsTable.child_id],
    references: [usersTable.id],
    relationName: 'child'
  })
}));

// Export all tables
export const tables = {
  users: usersTable,
  familyRelationships: familyRelationshipsTable,
  devices: devicesTable,
  locationTracking: locationTrackingTable,
  appUsage: appUsageTable,
  screenTimeLimits: screenTimeLimitsTable,
  webFilters: webFiltersTable,
  callLogs: callLogsTable,
  smsLogs: smsLogsTable,
  emergencyAlerts: emergencyAlertsTable,
  activityReports: activityReportsTable
};
