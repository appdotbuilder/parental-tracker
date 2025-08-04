
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, 
  Smartphone, 
  Clock, 
  Shield, 
  Phone, 
  MessageSquare, 
  AlertTriangle,
  BarChart3,
  User as UserIcon,
  Eye,
  Timer
} from 'lucide-react';
import type { 
  User, 
  Device, 
  LocationTracking, 
  AppUsage, 
  ScreenTimeLimit,
  WebFilter,
  CallLog,
  SmsLog,
  EmergencyAlert,
  CreateUserInput,
  CreateDeviceInput,
  CreateScreenTimeLimitInput,
  CreateWebFilterInput
} from '../../server/src/schema';

function App() {
  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [children, setChildren] = useState<User[]>([]);
  const [selectedChild, setSelectedChild] = useState<User | null>(null);
  
  // Device state
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  
  // Monitoring data state
  const [locations, setLocations] = useState<LocationTracking[]>([]);
  const [appUsage, setAppUsage] = useState<AppUsage[]>([]);
  const [screenTimeLimit, setScreenTimeLimit] = useState<ScreenTimeLimit | null>(null);
  const [webFilter, setWebFilter] = useState<WebFilter | null>(null);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>([]);
  
  // Form states
  const [newChildForm, setNewChildForm] = useState<CreateUserInput>({
    email: '',
    password: '',
    role: 'child',
    full_name: ''
  });
  
  const [newDeviceForm, setNewDeviceForm] = useState<CreateDeviceInput>({
    user_id: 0,
    device_name: '',
    device_type: 'android',
    device_id: ''
  });
  
  const [screenTimeLimitForm, setScreenTimeLimitForm] = useState<CreateScreenTimeLimitInput>({
    device_id: 0,
    daily_limit: 480, // 8 hours in minutes
    app_specific_limits: {}
  });
  
  const [webFilterForm, setWebFilterForm] = useState<CreateWebFilterInput>({
    device_id: 0,
    blocked_domains: [],
    blocked_categories: [],
    allowed_domains: []
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date()
  });

  // Initialize current user from authentication context
  useEffect(() => {
    setCurrentUser({
      id: 1,
      email: 'parent@example.com',
      password_hash: '',
      role: 'parent',
      full_name: 'Parent User',
      created_at: new Date(),
      updated_at: new Date()
    });
  }, []);

  // Load children data
  const loadChildren = useCallback(async () => {
    if (!currentUser) return;
    try {
      const result = await trpc.getChildrenByParent.query({ parentId: currentUser.id });
      setChildren(result);
      if (result.length > 0 && !selectedChild) {
        setSelectedChild(result[0]);
      }
    } catch (error) {
      console.error('Failed to load children:', error);
    }
  }, [currentUser, selectedChild]);

  // Load devices for selected child
  const loadDevices = useCallback(async () => {
    if (!selectedChild) return;
    try {
      const result = await trpc.getUserDevices.query({ userId: selectedChild.id });
      setDevices(result);
      if (result.length > 0 && !selectedDevice) {
        setSelectedDevice(result[0]);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  }, [selectedChild, selectedDevice]);

  // Load monitoring data for selected device
  const loadMonitoringData = useCallback(async () => {
    if (!selectedDevice) return;
    
    setLoading(true);
    try {
      // Load location history
      const locationData = await trpc.getLocationHistory.query({
        deviceId: selectedDevice.id,
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      setLocations(locationData);

      // Load app usage
      const appUsageData = await trpc.getAppUsage.query({
        deviceId: selectedDevice.id,
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      setAppUsage(appUsageData);

      // Load screen time limits
      const screenTimeLimits = await trpc.getScreenTimeLimits.query({
        deviceId: selectedDevice.id
      });
      setScreenTimeLimit(screenTimeLimits.length > 0 ? screenTimeLimits[0] : null);

      // Load web filters
      const webFilters = await trpc.getWebFilters.query({
        deviceId: selectedDevice.id
      });
      setWebFilter(webFilters.length > 0 ? webFilters[0] : null);

      // Load call logs
      const callLogData = await trpc.getCallLogs.query({
        deviceId: selectedDevice.id,
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      setCallLogs(callLogData);

      // Load SMS logs
      const smsLogData = await trpc.getSmsLogs.query({
        deviceId: selectedDevice.id,
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      setSmsLogs(smsLogData);

      // Load emergency alerts
      const alertData = await trpc.getEmergencyAlerts.query({
        deviceId: selectedDevice.id
      });
      setEmergencyAlerts(alertData);

      // Load activity reports
      const reportData = await trpc.getActivityReports.query({
        deviceId: selectedDevice.id,
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      // Activity reports are loaded but used for generating dashboard metrics
      console.log('Activity reports loaded:', reportData.length);

    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice, dateRange]);

  // Effects
  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    loadMonitoringData();
  }, [loadMonitoringData]);

  // Handlers
  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const newChild = await trpc.createUser.mutate(newChildForm);
      
      // Create family relationship
      await trpc.createFamilyRelationship.mutate({
        parent_id: currentUser.id,
        child_id: newChild.id
      });
      
      setChildren((prev: User[]) => [...prev, newChild]);
      setNewChildForm({
        email: '',
        password: '',
        role: 'child',
        full_name: ''
      });
    } catch (error) {
      console.error('Failed to create child:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild) return;
    
    setLoading(true);
    try {
      const deviceData = { ...newDeviceForm, user_id: selectedChild.id };
      const newDevice = await trpc.createDevice.mutate(deviceData);
      setDevices((prev: Device[]) => [...prev, newDevice]);
      setNewDeviceForm({
        user_id: 0,
        device_name: '',
        device_type: 'android',
        device_id: ''
      });
    } catch (error) {
      console.error('Failed to create device:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetScreenTimeLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice) return;
    
    setLoading(true);
    try {
      const limitData = { ...screenTimeLimitForm, device_id: selectedDevice.id };
      await trpc.setScreenTimeLimit.mutate(limitData);
      loadMonitoringData(); // Reload data
    } catch (error) {
      console.error('Failed to set screen time limit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetWebFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice) return;
    
    setLoading(true);
    try {
      const filterData = { ...webFilterForm, device_id: selectedDevice.id };
      await trpc.setWebFilter.mutate(filterData);
      loadMonitoringData(); // Reload data
    } catch (error) {
      console.error('Failed to set web filter:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    setLoading(true);
    try {
      await trpc.resolveEmergencyAlert.mutate({ alertId });
      setEmergencyAlerts((prev: EmergencyAlert[]) => 
        prev.map((alert: EmergencyAlert) => 
          alert.id === alertId 
            ? { ...alert, is_resolved: true, resolved_at: new Date() }
            : alert
        )
      );
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate screen time usage percentage
  const getScreenTimeUsage = () => {
    if (!screenTimeLimit || appUsage.length === 0) return 0;
    const totalUsage = appUsage.reduce((sum: number, usage: AppUsage) => sum + usage.usage_duration, 0);
    const dailyUsageMinutes = totalUsage / 60000; // Convert from milliseconds to minutes
    return Math.min((dailyUsageMinutes / screenTimeLimit.daily_limit) * 100, 100);
  };

  const unresolvedAlerts = emergencyAlerts.filter((alert: EmergencyAlert) => !alert.is_resolved);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            👨‍👩‍👧‍👦 Aplikasi Pemantauan Orang Tua
          </h1>
          <p className="text-gray-600">Pantau dan lindungi anak Anda dengan aman dan bertanggung jawab</p>
        </div>

        {/* Child Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Pilih Anak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center flex-wrap">
              <Select 
                value={selectedChild?.id.toString() || ''} 
                onValueChange={(value: string) => {
                  const child = children.find((c: User) => c.id.toString() === value);
                  setSelectedChild(child || null);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Pilih anak" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child: User) => (
                    <SelectItem key={child.id} value={child.id.toString()}>
                      {child.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedChild && devices.length > 0 && (
                <Select 
                  value={selectedDevice?.id.toString() || ''} 
                  onValueChange={(value: string) => {
                    const device = devices.find((d: Device) => d.id.toString() === value);
                    setSelectedDevice(device || null);
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Pilih perangkat" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device: Device) => (
                      <SelectItem key={device.id} value={device.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          {device.device_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {unresolvedAlerts.length > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {unresolvedAlerts.length} Alert Darurat
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedChild && selectedDevice ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 md:grid-cols-8">
              <TabsTrigger value="dashboard" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="location" className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Lokasi</span>
              </TabsTrigger>
              <TabsTrigger value="apps" className="flex items-center gap-1">
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline">Aplikasi</span>
              </TabsTrigger>
              <TabsTrigger value="screentime" className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Waktu Layar</span>
              </TabsTrigger>
              <TabsTrigger value="web" className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Filter Web</span>
              </TabsTrigger>
              <TabsTrigger value="calls" className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Panggilan</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">SMS</span>
              </TabsTrigger>
              <TabsTrigger value="alerts" className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Alert</span>
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Lokasi Terakhir</CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {locations.length > 0 ? locations[0].address || 'Tidak diketahui' : 'Tidak ada data'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {locations.length > 0 ? locations[0].timestamp.toLocaleTimeString() : ''}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Waktu Layar Hari Ini</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round(appUsage.reduce((sum: number, usage: AppUsage) => sum + usage.usage_duration, 0) / 60000)} menit
                    </div>
                    <Progress value={getScreenTimeUsage()} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Panggilan</CardTitle>
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{callLogs.length}</div>
                    <p className="text-xs text-muted-foreground">7 hari terakhir</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Alert Aktif</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{unresolvedAlerts.length}</div>
                    <p className="text-xs text-muted-foreground">Perlu perhatian</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Aktivitas Terkini</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {appUsage.slice(0, 5).map((usage: AppUsage) => (
                      <div key={usage.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Smartphone className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{usage.app_name}</p>
                            <p className="text-sm text-gray-500">
                              {usage.start_time.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {Math.round(usage.usage_duration / 60000)} menit
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    📍 Riwayat Lokasi
                  </CardTitle>
                  <CardDescription>
                    Lokasi anak Anda berdasarkan GPS perangkat (hanya saat GPS dan data aktif)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {locations.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Belum ada data lokasi tersedia</p>
                        <p className="text-sm">Pastikan GPS dan data internet aktif di perangkat anak</p>
                      </div>
                    ) : (
                      locations.map((location: LocationTracking) => (
                        <div key={location.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <MapPin className="h-5 w-5 text-blue-600 mt-1" />
                          <div className="flex-1">
                            <p className="font-medium">
                              {location.address || `${location.latitude}, ${location.longitude}`}
                            </p>
                            <p className="text-sm text-gray-500">
                              {location.timestamp.toLocaleString()}
                            </p>
                            {location.accuracy && (
                              <p className="text-xs text-gray-400">
                                Akurasi: ±{location.accuracy}m
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Apps Tab */}
            <TabsContent value="apps" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    📱 Penggunaan Aplikasi
                  </CardTitle>
                  <CardDescription>
                    Pantau aplikasi yang digunakan anak Anda
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {appUsage.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Belum ada data penggunaan aplikasi</p>
                      </div>
                    ) : (
                      appUsage.map((usage: AppUsage) => (
                        <div key={usage.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Smartphone className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{usage.app_name}</p>
                              <p className="text-sm text-gray-500">{usage.package_name}</p>
                              <p className="text-xs text-gray-400">
                                {usage.start_time.toLocaleString()}
                                {usage.end_time && ` - ${usage.end_time.toLocaleString()}`}
                              </p>
                            </div>
                          </div>
                          <Badge>
                            {Math.round(usage.usage_duration / 60000)} menit
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Screen Time Tab */}
            <TabsContent value="screentime" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Timer className="h-5 w-5" />
                      ⏰ Batas Waktu Layar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {screenTimeLimit ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-600">Batas Harian</p>
                          <p className="text-2xl font-bold">{screenTimeLimit.daily_limit} menit</p>
                        </div>
                        <Progress value={getScreenTimeUsage()} />
                        <p className="text-sm text-gray-500">
                          Penggunaan: {Math.round(getScreenTimeUsage())}%
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-500">Belum ada batas waktu layar yang ditetapkan</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Atur Batas Waktu</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSetScreenTimeLimit} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Batas Harian (menit)</label>
                        <Input
                          type="number"
                          value={screenTimeLimitForm.daily_limit}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setScreenTimeLimitForm((prev: CreateScreenTimeLimitInput) => ({
                              ...prev,
                              daily_limit: parseInt(e.target.value) || 0
                            }))
                          }
                          min="1"
                          required
                        />
                      </div>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Menyimpan...' : 'Simpan Batas'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Web Filter Tab */}
            <TabsContent value="web" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      🛡️ Filter Konten Web
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {webFilter ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-red-600">Domain Diblokir</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {webFilter.blocked_domains.map((domain: string, index: number) => (
                              <Badge key={index} variant="destructive">{domain}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-600">Domain Diizinkan</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {webFilter.allowed_domains.map((domain: string, index: number) => (
                              <Badge key={index} variant="secondary">{domain}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">Belum ada filter web yang ditetapkan</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Atur Filter Web</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSetWebFilter} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Domain Diblokir (pisahkan dengan koma)</label>
                        <Input
                          placeholder="facebook.com, youtube.com"
                          value={webFilterForm.blocked_domains?.join(', ') || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setWebFilterForm((prev: CreateWebFilterInput) => ({
                              ...prev,
                              blocked_domains: e.target.value.split(',').map((d: string) => d.trim()).filter(Boolean)
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Domain Diizinkan (pisahkan dengan koma)</label>
                        <Input
                          placeholder="google.com, wikipedia.org"
                          value={webFilterForm.allowed_domains?.join(', ') || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setWebFilterForm((prev: CreateWebFilterInput) => ({
                              ...prev,
                              allowed_domains: e.target.value.split(',').map((d: string) => d.trim()).filter(Boolean)
                            }))
                          }
                        />
                      
                      </div>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Menyimpan...' : 'Simpan Filter'}
                      </Button>
                    </form>
                  </CardContent>
                
                </Card>
              </div>
            </TabsContent>

            {/* Calls Tab */}
            <TabsContent value="calls" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    📞 Log Panggilan
                  </CardTitle>
                  <CardDescription>
                    Pantau panggilan masuk dan keluar (tanpa mendengar isi percakapan)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {callLogs.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Belum ada log panggilan</p>
                      </div>
                    ) : (
                      callLogs.map((call: CallLog) => (
                        <div key={call.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              call.call_type === 'incoming' ? 'bg-green-100' :
                              call.call_type === 'outgoing' ? 'bg-blue-100' : 'bg-red-100'
                            }`}>
                              <Phone className={`h-5 w-5 ${
                                call.call_type === 'incoming' ? 'text-green-600' :
                                call.call_type === 'outgoing' ? 'text-blue-600' : 'text-red-600'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium">
                                {call.contact_name || call.phone_number}
                              </p>
                              <p className="text-sm text-gray-500">
                                {call.timestamp.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={
                              call.call_type === 'incoming' ? 'secondary' :
                              call.call_type === 'outgoing' ? 'default' : 'destructive'
                            }>
                              {call.call_type === 'incoming' ? 'Masuk' :
                               call.call_type === 'outgoing' ? 'Keluar' : 'Tidak Terjawab'}
                            </Badge>
                            <p className="text-sm text-gray-500 mt-1">
                              {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Messages Tab */}
            <TabsContent value="messages" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    💬 Log SMS
                  </CardTitle>
                  <CardDescription>
                    Pantau SMS masuk dan keluar (tanpa membaca isi pesan)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {smsLogs.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Belum ada log SMS</p>
                      </div>
                    ) : (
                      smsLogs.map((sms: SmsLog) => (
                        <div key={sms.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              sms.message_type === 'received' ? 'bg-green-100' : 'bg-blue-100'
                            }`}>
                              <MessageSquare className={`h-5 w-5 ${
                                sms.message_type === 'received' ? 'text-green-600' : 'text-blue-600'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium">
                                {sms.contact_name || sms.phone_number}
                              </p>
                              <p className="text-sm text-gray-500">
                                {sms.timestamp.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={sms.message_type === 'received' ? 'secondary' : 'default'}>
                              {sms.message_type === 'received' ? 'Diterima' : 'Dikirim'}
                            </Badge>
                            <p className="text-sm text-gray-500 mt-1">
                              {sms.message_length} karakter
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent value="alerts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    🚨 Notifikasi Darurat
                  </CardTitle>
                  <CardDescription>
                    Alert dan notifikasi penting dari perangkat anak
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {emergencyAlerts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Tidak ada alert darurat</p>
                      </div>
                    ) : (
                      emergencyAlerts.map((alert: EmergencyAlert) => (
                        <Alert key={alert.id} className={`${
                          alert.is_resolved ? 'border-gray-200' : 'border-red-200 bg-red-50'
                        }`}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant={
                                    alert.alert_type === 'panic_button' ? 'destructive' :
                                    alert.alert_type === 'location_alert' ? 'default' : 'secondary'
                                  }>
                                    {alert.alert_type === 'panic_button' ? '🆘 Tombol Darurat' :
                                     alert.alert_type === 'location_alert' ? '📍 Alert Lokasi' :
                                     alert.alert_type === 'app_alert' ? '📱 Alert Aplikasi' : '⚠️ Custom'}
                                  </Badge>
                                  {alert.is_resolved && (
                                    <Badge variant="outline">✅ Teratasi</Badge>
                                  )}
                                </div>
                                <p className="font-medium mb-1">{alert.message}</p>
                                <p className="text-sm text-gray-500">
                                  {alert.created_at.toLocaleString()}
                                </p>
                                {alert.latitude && alert.longitude && (
                                  <p className="text-sm text-gray-500">
                                    📍 {alert.latitude}, {alert.longitude}
                                  </p>
                                )}
                              </div>
                              {!alert.is_resolved && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResolveAlert(alert.id)}
                                  disabled={loading}
                                >
                                  Tandai Teratasi
                                </Button>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          // Setup flow when no child or device selected
          <div className="space-y-6">
            {children.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>👶 Tambah Anak Pertama</CardTitle>
                  <CardDescription>
                    Buat akun untuk anak Anda untuk mulai pemantauan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateChild} className="space-y-4">
                    <Input
                      placeholder="Nama lengkap anak"
                      value={newChildForm.full_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewChildForm((prev: CreateUserInput) => ({ ...prev, full_name: e.target.value }))
                      }
                      required
                    />
                    <Input
                      type="email"
                      placeholder="Email anak"
                      value={newChildForm.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewChildForm((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                    <Input
                      type="password"
                      placeholder="Password (min. 6 karakter)"
                      value={newChildForm.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewChildForm((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
                      }
                      required
                    />
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Membuat...' : 'Buat Akun Anak'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : selectedChild && devices.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>📱 Tambah Perangkat untuk {selectedChild.full_name}</CardTitle>
                  <CardDescription>
                    Daftarkan perangkat anak untuk mulai pemantauan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateDevice} className="space-y-4">
                    <Input
                      placeholder="Nama perangkat (contoh: iPhone Sarah)"
                      value={newDeviceForm.device_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewDeviceForm((prev: CreateDeviceInput) => ({ ...prev, device_name: e.target.value }))
                      }
                      required
                    />
                    <Select
                      value={newDeviceForm.device_type}
                      onValueChange={(value: 'android' | 'ios') =>
                        setNewDeviceForm((prev: CreateDeviceInput) => ({ ...prev, device_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="android">📱 Android</SelectItem>
                        <SelectItem value="ios">🍎 iOS</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Device ID (unik untuk setiap perangkat)"
                      value={newDeviceForm.device_id}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewDeviceForm((prev: CreateDeviceInput) => ({ ...prev, device_id: e.target.value }))
                      }
                      required
                    />
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Menambahkan...' : 'Tambah Perangkat'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            {/* Privacy Notice */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Eye className="h-5 w-5" />
                  🔒 Privasi & Keamanan
                </CardTitle>
              </CardHeader>
              <CardContent className="text-blue-700">
                <div className="space-y-2 text-sm">
                  <p>✅ <strong>Yang Dipantau:</strong> Lokasi GPS, penggunaan aplikasi, waktu layar, log panggilan/SMS, situs web yang dikunjungi</p>
                  <p>❌ <strong>Yang TIDAK Dipantau:</strong> Isi pesan pribadi, foto, akses kamera tersembunyi, percakapan dalam aplikasi chat</p>
                  <p>🛡️ <strong>Keamanan:</strong> Semua data dienkripsi dan hanya dapat diakses oleh orang tua yang sah</p>
                  <p>👨‍👩‍👧‍👦 <strong>Transparansi:</strong> Anak akan mengetahui bahwa perangkat mereka dipantau untuk keamanan</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
