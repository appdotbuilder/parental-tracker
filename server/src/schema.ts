
import { z } from 'zod';

// User schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string(),
  password_hash: z.string(),
  role: z.enum(['parent', 'child']),
  full_name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['parent', 'child']),
  full_name: z.string()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Family relationship schemas
export const familyRelationshipSchema = z.object({
  id: z.number(),
  parent_id: z.number(),
  child_id: z.number(),
  created_at: z.coerce.date()
});

export type FamilyRelationship = z.infer<typeof familyRelationshipSchema>;

export const createFamilyRelationshipInputSchema = z.object({
  parent_id: z.number(),
  child_id: z.number()
});

export type CreateFamilyRelationshipInput = z.infer<typeof createFamilyRelationshipInputSchema>;

export const getChildrenByParentInputSchema = z.object({
  parentId: z.number()
});

export type GetChildrenByParentInput = z.infer<typeof getChildrenByParentInputSchema>;

// Device schemas
export const deviceSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  device_name: z.string(),
  device_type: z.enum(['android', 'ios']),
  device_id: z.string(),
  is_active: z.boolean(),
  last_seen: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type Device = z.infer<typeof deviceSchema>;

export const createDeviceInputSchema = z.object({
  user_id: z.number(),
  device_name: z.string(),
  device_type: z.enum(['android', 'ios']),
  device_id: z.string()
});

export type CreateDeviceInput = z.infer<typeof createDeviceInputSchema>;

export const getUserDevicesInputSchema = z.object({
  userId: z.number()
});

export type GetUserDevicesInput = z.infer<typeof getUserDevicesInputSchema>;

// Location tracking schemas
export const locationTrackingSchema = z.object({
  id: z.number(),
  device_id: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().nullable(),
  address: z.string().nullable(),
  timestamp: z.coerce.date(),
  created_at: z.coerce.date()
});

export type LocationTracking = z.infer<typeof locationTrackingSchema>;

export const createLocationTrackingInputSchema = z.object({
  device_id: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().optional(),
  address: z.string().optional()
});

export type CreateLocationTrackingInput = z.infer<typeof createLocationTrackingInputSchema>;

export const getLocationHistoryInputSchema = z.object({
  deviceId: z.number(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date()
});

export type GetLocationHistoryInput = z.infer<typeof getLocationHistoryInputSchema>;

// App usage monitoring schemas
export const appUsageSchema = z.object({
  id: z.number(),
  device_id: z.number(),
  app_name: z.string(),
  package_name: z.string(),
  usage_duration: z.number().int(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type AppUsage = z.infer<typeof appUsageSchema>;

export const createAppUsageInputSchema = z.object({
  device_id: z.number(),
  app_name: z.string(),
  package_name: z.string(),
  usage_duration: z.number().int(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date().optional()
});

export type CreateAppUsageInput = z.infer<typeof createAppUsageInputSchema>;

export const getAppUsageInputSchema = z.object({
  deviceId: z.number(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date()
});

export type GetAppUsageInput = z.infer<typeof getAppUsageInputSchema>;

// Screen time management schemas
export const screenTimeLimitSchema = z.object({
  id: z.number(),
  device_id: z.number(),
  daily_limit: z.number().int(),
  app_specific_limits: z.record(z.number().int()).nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type ScreenTimeLimit = z.infer<typeof screenTimeLimitSchema>;

export const createScreenTimeLimitInputSchema = z.object({
  device_id: z.number(),
  daily_limit: z.number().int().positive(),
  app_specific_limits: z.record(z.number().int().positive()).optional()
});

export type CreateScreenTimeLimitInput = z.infer<typeof createScreenTimeLimitInputSchema>;

export const getScreenTimeLimitsInputSchema = z.object({
  deviceId: z.number()
});

export type GetScreenTimeLimitsInput = z.infer<typeof getScreenTimeLimitsInputSchema>;

// Web content filtering schemas
export const webFilterSchema = z.object({
  id: z.number(),
  device_id: z.number(),
  blocked_domains: z.array(z.string()),
  blocked_categories: z.array(z.string()),
  allowed_domains: z.array(z.string()),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type WebFilter = z.infer<typeof webFilterSchema>;

export const createWebFilterInputSchema = z.object({
  device_id: z.number(),
  blocked_domains: z.array(z.string()).optional(),
  blocked_categories: z.array(z.string()).optional(),
  allowed_domains: z.array(z.string()).optional()
});

export type CreateWebFilterInput = z.infer<typeof createWebFilterInputSchema>;

export const getWebFiltersInputSchema = z.object({
  deviceId: z.number()
});

export type GetWebFiltersInput = z.infer<typeof getWebFiltersInputSchema>;

// Call log monitoring schemas
export const callLogSchema = z.object({
  id: z.number(),
  device_id: z.number(),
  phone_number: z.string(),
  contact_name: z.string().nullable(),
  call_type: z.enum(['incoming', 'outgoing', 'missed']),
  duration: z.number().int(),
  timestamp: z.coerce.date(),
  created_at: z.coerce.date()
});

export type CallLog = z.infer<typeof callLogSchema>;

export const createCallLogInputSchema = z.object({
  device_id: z.number(),
  phone_number: z.string(),
  contact_name: z.string().optional(),
  call_type: z.enum(['incoming', 'outgoing', 'missed']),
  duration: z.number().int().nonnegative(),
  timestamp: z.coerce.date()
});

export type CreateCallLogInput = z.infer<typeof createCallLogInputSchema>;

export const getCallLogsInputSchema = z.object({
  deviceId: z.number(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date()
});

export type GetCallLogsInput = z.infer<typeof getCallLogsInputSchema>;

// SMS log monitoring schemas
export const smsLogSchema = z.object({
  id: z.number(),
  device_id: z.number(),
  phone_number: z.string(),
  contact_name: z.string().nullable(),
  message_type: z.enum(['received', 'sent']),
  message_length: z.number().int(),
  timestamp: z.coerce.date(),
  created_at: z.coerce.date()
});

export type SmsLog = z.infer<typeof smsLogSchema>;

export const createSmsLogInputSchema = z.object({
  device_id: z.number(),
  phone_number: z.string(),
  contact_name: z.string().optional(),
  message_type: z.enum(['received', 'sent']),
  message_length: z.number().int().nonnegative(),
  timestamp: z.coerce.date()
});

export type CreateSmsLogInput = z.infer<typeof createSmsLogInputSchema>;

export const getSmsLogsInputSchema = z.object({
  deviceId: z.number(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date()
});

export type GetSmsLogsInput = z.infer<typeof getSmsLogsInputSchema>;

// Emergency alert schemas
export const emergencyAlertSchema = z.object({
  id: z.number(),
  device_id: z.number(),
  alert_type: z.enum(['panic_button', 'location_alert', 'app_alert', 'custom']),
  message: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  is_resolved: z.boolean(),
  created_at: z.coerce.date(),
  resolved_at: z.coerce.date().nullable()
});

export type EmergencyAlert = z.infer<typeof emergencyAlertSchema>;

export const createEmergencyAlertInputSchema = z.object({
  device_id: z.number(),
  alert_type: z.enum(['panic_button', 'location_alert', 'app_alert', 'custom']),
  message: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

export type CreateEmergencyAlertInput = z.infer<typeof createEmergencyAlertInputSchema>;

export const getEmergencyAlertsInputSchema = z.object({
  deviceId: z.number()
});

export type GetEmergencyAlertsInput = z.infer<typeof getEmergencyAlertsInputSchema>;

export const resolveEmergencyAlertInputSchema = z.object({
  alertId: z.number()
});

export type ResolveEmergencyAlertInput = z.infer<typeof resolveEmergencyAlertInputSchema>;

// Activity report schemas
export const activityReportSchema = z.object({
  id: z.number(),
  device_id: z.number(),
  report_date: z.coerce.date(),
  total_screen_time: z.number().int(),
  most_used_apps: z.array(z.object({
    app_name: z.string(),
    usage_time: z.number().int()
  })),
  locations_visited: z.number().int(),
  calls_made: z.number().int(),
  sms_sent: z.number().int(),
  websites_blocked: z.number().int(),
  created_at: z.coerce.date()
});

export type ActivityReport = z.infer<typeof activityReportSchema>;

export const getActivityReportInputSchema = z.object({
  device_id: z.number(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
});

export type GetActivityReportInput = z.infer<typeof getActivityReportInputSchema>;

export const getActivityReportsInputSchema = z.object({
  deviceId: z.number(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date()
});

export type GetActivityReportsInput = z.infer<typeof getActivityReportsInputSchema>;
