
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createUserInputSchema,
  loginInputSchema,
  createFamilyRelationshipInputSchema,
  getChildrenByParentInputSchema,
  createDeviceInputSchema,
  getUserDevicesInputSchema,
  createLocationTrackingInputSchema,
  getLocationHistoryInputSchema,
  createAppUsageInputSchema,
  getAppUsageInputSchema,
  createScreenTimeLimitInputSchema,
  getScreenTimeLimitsInputSchema,
  createWebFilterInputSchema,
  getWebFiltersInputSchema,
  createCallLogInputSchema,
  getCallLogsInputSchema,
  createSmsLogInputSchema,
  getSmsLogsInputSchema,
  createEmergencyAlertInputSchema,
  getEmergencyAlertsInputSchema,
  resolveEmergencyAlertInputSchema,
  getActivityReportInputSchema,
  getActivityReportsInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { loginUser } from './handlers/login_user';
import { createFamilyRelationship } from './handlers/create_family_relationship';
import { createDevice } from './handlers/create_device';
import { getUserDevices } from './handlers/get_user_devices';
import { trackLocation } from './handlers/track_location';
import { getLocationHistory } from './handlers/get_location_history';
import { logAppUsage } from './handlers/log_app_usage';
import { getAppUsage } from './handlers/get_app_usage';
import { setScreenTimeLimit } from './handlers/set_screen_time_limit';
import { getScreenTimeLimits } from './handlers/get_screen_time_limits';
import { setWebFilter } from './handlers/set_web_filter';
import { getWebFilters } from './handlers/get_web_filters';
import { logCall } from './handlers/log_call';
import { getCallLogs } from './handlers/get_call_logs';
import { logSms } from './handlers/log_sms';
import { getSmsLogs } from './handlers/get_sms_logs';
import { createEmergencyAlert } from './handlers/create_emergency_alert';
import { getEmergencyAlerts } from './handlers/get_emergency_alerts';
import { resolveEmergencyAlert } from './handlers/resolve_emergency_alert';
import { generateActivityReport } from './handlers/generate_activity_report';
import { getActivityReports } from './handlers/get_activity_reports';
import { getChildrenByParent } from './handlers/get_children_by_parent';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  loginUser: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Family management
  createFamilyRelationship: publicProcedure
    .input(createFamilyRelationshipInputSchema)
    .mutation(({ input }) => createFamilyRelationship(input)),
  
  getChildrenByParent: publicProcedure
    .input(getChildrenByParentInputSchema)
    .query(({ input }) => getChildrenByParent(input.parentId)),

  // Device management
  createDevice: publicProcedure
    .input(createDeviceInputSchema)
    .mutation(({ input }) => createDevice(input)),
  
  getUserDevices: publicProcedure
    .input(getUserDevicesInputSchema)
    .query(({ input }) => getUserDevices(input.userId)),

  // Location tracking
  trackLocation: publicProcedure
    .input(createLocationTrackingInputSchema)
    .mutation(({ input }) => trackLocation(input)),
  
  getLocationHistory: publicProcedure
    .input(getLocationHistoryInputSchema)
    .query(({ input }) => getLocationHistory(input.deviceId, input.startDate, input.endDate)),

  // App usage monitoring
  logAppUsage: publicProcedure
    .input(createAppUsageInputSchema)
    .mutation(({ input }) => logAppUsage(input)),
  
  getAppUsage: publicProcedure
    .input(getAppUsageInputSchema)
    .query(({ input }) => getAppUsage(input.deviceId, input.startDate, input.endDate)),

  // Screen time management
  setScreenTimeLimit: publicProcedure
    .input(createScreenTimeLimitInputSchema)
    .mutation(({ input }) => setScreenTimeLimit(input)),
  
  getScreenTimeLimits: publicProcedure
    .input(getScreenTimeLimitsInputSchema)
    .query(({ input }) => getScreenTimeLimits(input.deviceId)),

  // Web content filtering
  setWebFilter: publicProcedure
    .input(createWebFilterInputSchema)
    .mutation(({ input }) => setWebFilter(input)),
  
  getWebFilters: publicProcedure
    .input(getWebFiltersInputSchema)
    .query(({ input }) => getWebFilters(input.deviceId)),

  // Call monitoring
  logCall: publicProcedure
    .input(createCallLogInputSchema)
    .mutation(({ input }) => logCall(input)),
  
  getCallLogs: publicProcedure
    .input(getCallLogsInputSchema)
    .query(({ input }) => getCallLogs(input.deviceId, input.startDate, input.endDate)),

  // SMS monitoring
  logSms: publicProcedure
    .input(createSmsLogInputSchema)
    .mutation(({ input }) => logSms(input)),
  
  getSmsLogs: publicProcedure
    .input(getSmsLogsInputSchema)
    .query(({ input }) => getSmsLogs(input.deviceId, input.startDate, input.endDate)),

  // Emergency alerts
  createEmergencyAlert: publicProcedure
    .input(createEmergencyAlertInputSchema)
    .mutation(({ input }) => createEmergencyAlert(input)),
  
  getEmergencyAlerts: publicProcedure
    .input(getEmergencyAlertsInputSchema)
    .query(({ input }) => getEmergencyAlerts(input.deviceId)),
  
  resolveEmergencyAlert: publicProcedure
    .input(resolveEmergencyAlertInputSchema)
    .mutation(({ input }) => resolveEmergencyAlert(input.alertId)),

  // Activity reports
  generateActivityReport: publicProcedure
    .input(getActivityReportInputSchema)
    .mutation(({ input }) => generateActivityReport(input)),
  
  getActivityReports: publicProcedure
    .input(getActivityReportsInputSchema)
    .query(({ input }) => getActivityReports(input.deviceId, input.startDate, input.endDate)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Parental Monitoring TRPC server listening at port: ${port}`);
}

start();
