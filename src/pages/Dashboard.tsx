import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import UserProfile from "@/components/UserProfile";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCompanyEmployees } from "@/hooks/use-company-data";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Clock, Play, Pause, TrendingUp, Users, Calendar, FileText, AlertTriangle, Timer, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInMinutes, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { de } from "date-fns/locale";

type TimeEntry = Tables<'time_entries'>;

interface ActiveTimeEntry {
  id: string;
  start_time: string;
  description?: string;
  project?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, employee, company, isAdmin, isManager } = useAuthContext();
  const { data: companyEmployees = [] } = useCompanyEmployees();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<ActiveTimeEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const MINUTES_PER_HOUR = 60;
  
  // Get employee's configured work hours from Settings
  const getEmployeeWorkHours = (): number => {
    if (!employee?.id) return 8;
    
    const workHourSettings = localStorage.getItem("workHourSettings");
    if (workHourSettings) {
      const settings = JSON.parse(workHourSettings);
      const employeeSetting = settings.find((setting: any) => setting.employeeId === employee.id);
      if (employeeSetting) {
        return employeeSetting.workHoursPerDay;
      }
    }
    return 8; // Default
  };
  
  const EMPLOYEE_WORK_HOURS = getEmployeeWorkHours();
  const EMPLOYEE_WORK_MINUTES = EMPLOYEE_WORK_HOURS * MINUTES_PER_HOUR;

  // Fetch time entries from Supabase
  const fetchTimeEntries = async () => {
    if (!employee?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employee.id)
        .order('start_time', { ascending: false })
        .limit(100); // Get recent entries
        
      if (error) {
        console.error('Error fetching time entries:', error);
        return;
      }
      
      setTimeEntries(data || []);
    } catch (error) {
      console.error('Error in fetchTimeEntries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check for active time entry
  const checkActiveEntry = async () => {
    if (!employee?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employee.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1);
        
      if (error) {
        console.error('Error checking active entry:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const entry = data[0];
        setActiveEntry({
          id: entry.id,
          start_time: entry.start_time,
          description: entry.description || '',
          project: entry.project || ''
        });
      } else {
        setActiveEntry(null);
      }
    } catch (error) {
      console.error('Error in checkActiveEntry:', error);
    }
  };

  // Calculate duration in minutes
  const calculateDurationInMinutes = (startTime: string, endTime: string | null): number => {
    if (!endTime) return differenceInMinutes(currentTime, new Date(startTime));
    return differenceInMinutes(new Date(endTime), new Date(startTime));
  };

  // Calculate today's total work time
  const calculateTodaysWorkTime = (): number => {
    const today = startOfDay(new Date());
    const tomorrow = endOfDay(new Date());
    
    const todaysEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.start_time);
      return entryDate >= today && entryDate <= tomorrow;
    });
    
    const completedTime = todaysEntries
      .filter(entry => entry.end_time)
      .reduce((total, entry) => {
        return total + calculateDurationInMinutes(entry.start_time, entry.end_time);
      }, 0);
    
    // Add active session time if any
    const activeTime = activeEntry ? 
      calculateDurationInMinutes(activeEntry.start_time, null) : 0;
    
    return completedTime + activeTime;
  };

  // Calculate this week's total work time
  const calculateWeeklyWorkTime = (): number => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    
    return timeEntries
      .filter(entry => {
        const entryDate = new Date(entry.start_time);
        return entryDate >= weekStart && entryDate <= weekEnd && entry.end_time;
      })
      .reduce((total, entry) => {
        return total + calculateDurationInMinutes(entry.start_time, entry.end_time);
      }, 0);
  };

  // Calculate overtime for this week
  const calculateWeeklyOvertime = (): number => {
    const weeklyMinutes = calculateWeeklyWorkTime();
    const expectedWeeklyMinutes = EMPLOYEE_WORK_MINUTES * 5; // 5 work days
    return Math.max(0, weeklyMinutes - expectedWeeklyMinutes);
  };

  // Format minutes to time string
  const formatMinutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const secs = 0; // We don't track seconds in database
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format minutes to hours display
  const formatMinutesToHours = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  // Start time tracking
  const handleStartTime = async () => {
    if (!employee?.id) {
      toast({
        title: "Fehler",
        description: "Kein Mitarbeiter gefunden.",
        variant: "destructive",
      });
      return;
    }

    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          employee_id: employee.id,
          start_time: now,
          end_time: null,
          break_duration: 0,
          description: '',
          project: 'Dashboard-Erfassung',
          is_approved: false
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error starting time entry:', error);
        toast({
          title: "Fehler",
          description: "Zeiterfassung konnte nicht gestartet werden.",
          variant: "destructive",
        });
        return;
      }
      
      setActiveEntry({
        id: data.id,
        start_time: data.start_time,
        description: data.description || '',
        project: data.project || ''
      });
      
      toast({
        title: "Eingestempelt",
        description: "Ihre Zeiterfassung wurde gestartet.",
      });
      
      fetchTimeEntries();
    } catch (error) {
      console.error('Error in handleStartTime:', error);
    }
  };

  // Stop time tracking
  const handleStopTime = async () => {
    if (!activeEntry) return;

    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('time_entries')
        .update({ end_time: now })
        .eq('id', activeEntry.id);
        
      if (error) {
        console.error('Error stopping time entry:', error);
        toast({
          title: "Fehler",
          description: "Zeiterfassung konnte nicht gestoppt werden.",
          variant: "destructive",
        });
        return;
      }
      
      const duration = calculateDurationInMinutes(activeEntry.start_time, now);
      
      setActiveEntry(null);
      
      toast({
        title: "Ausgestempelt",
        description: `Arbeitszeit: ${formatMinutesToHours(duration)}`,
      });
      
      fetchTimeEntries();
    } catch (error) {
      console.error('Error in handleStopTime:', error);
    }
  };

  const handleClockToggle = () => {
    if (activeEntry) {
      handleStopTime();
    } else {
      handleStartTime();
    }
  };

  // Sample unassigned shifts data
  const getUnassignedShifts = () => {
    const today = new Date();
    const nextWeek = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      nextWeek.push({
        date: date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }),
        shifts: [
          { id: `morning-${i}`, name: 'Frühschicht', time: '06:00 - 14:00', assigned: i === 0 || i === 2 },
          { id: `afternoon-${i}`, name: 'Spätschicht', time: '14:00 - 22:00', assigned: i === 1 || i === 3 || i === 4 },
          { id: `night-${i}`, name: 'Nachtschicht', time: '22:00 - 06:00', assigned: i === 0 || i === 6 }
        ]
      });
    }
    return nextWeek;
  };

  const unassignedShifts = getUnassignedShifts()
    .flatMap(day => 
      day.shifts
        .filter(shift => !shift.assigned)
        .map(shift => ({ ...shift, date: day.date }))
    );

  const overtimeMinutes = calculateWeeklyOvertime();
  const overtimeHours = Math.floor(overtimeMinutes / 60);
  const todaysWorkMinutes = calculateTodaysWorkTime();

  // Fetch data when employee changes
  useEffect(() => {
    if (employee?.id) {
      fetchTimeEntries();
      checkActiveEntry();
    }
  }, [employee?.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const stats = [
    {
      title: "Arbeitszeit heute",
      value: formatTime(workTime),
      icon: Clock,
      color: "text-primary",
    },
    {
      title: isAdmin ? "Unbesetzte Schichten" : "Überstunden",
      value: isAdmin ? unassignedShifts.length.toString() : `${overtimeHours}h`,
      icon: isAdmin ? AlertTriangle : Timer,
      color: isAdmin ? (unassignedShifts.length > 0 ? "text-warning" : "text-success") : (overtimeHours > 0 ? "text-warning" : "text-success"),
    },
    {
      title: "Team Mitglieder",
      value: companyEmployees.length.toString(),
      icon: Users,
      color: "text-accent",
    },
    {
      title: "Offene Urlaubsanträge",
      value: isAdmin ? "3" : "1",
      icon: Calendar,
      color: "text-warning",
    },
  ];

  const recentActivities = [
    { time: "09:00", user: "Max Müller", action: "Eingestempelt", type: "clock-in" },
    { time: "09:15", user: "Anna Schmidt", action: "Schicht Frühschicht begonnen", type: "shift" },
    { time: "10:30", user: "Tom Weber", action: "Urlaubsantrag eingereicht", type: "vacation" },
    { time: "11:00", user: "Lisa Klein", action: "Pausenzeit beendet", type: "break" },
    { time: "14:00", user: "Peter Klein", action: "Schichtwechsel zu Spätschicht", type: "shift" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">
              Dashboard{company ? ` - ${company.name}` : ''}
            </h1>
            <p className="text-muted-foreground">
              Welcome back{employee ? `, ${employee.first_name}` : ''}! Today is {currentTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {currentTime.toLocaleTimeString('de-DE')}
            </p>
            <Button
              size="lg"
              variant={isClocked ? "destructive" : "success"}
              onClick={handleClockToggle}
              className="mt-2"
            >
              {isClocked ? <Pause className="mr-2" /> : <Play className="mr-2" />}
              {isClocked ? "Ausstempeln" : "Einstempeln"}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="activities">Aktivitäten</TabsTrigger>
            <TabsTrigger value="schedule">Schichtplan</TabsTrigger>
            {isAdmin && <TabsTrigger value="team">Team</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Wochenübersicht</CardTitle>
                  <CardDescription>
                    Ihre Arbeitszeiten der letzten 7 Tage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    <TrendingUp className="h-8 w-8 mr-2" />
                    <span>Chart-Visualisierung folgt</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{isAdmin ? "Unbesetzte Schichten" : "Überstunden-Tracking"}</CardTitle>
                  <CardDescription>
                    {isAdmin ? "Schichten, die noch Personal benötigen" : "Ihre Überstunden für diese Woche"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isAdmin ? (
                    <div className="space-y-3">
                      {unassignedShifts.length === 0 ? (
                        <div className="text-center py-4">
                          <div className="text-green-600 mb-2">
                            <Users className="h-8 w-8 mx-auto" />
                          </div>
                          <p className="text-sm text-muted-foreground">Alle Schichten sind besetzt! 🎉</p>
                        </div>
                      ) : (
                        unassignedShifts.slice(0, 5).map((shift, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div>
                              <p className="font-medium text-orange-800">{shift.name}</p>
                              <p className="text-sm text-orange-600">{shift.date} • {shift.time}</p>
                            </div>
                            <Badge variant="outline" className="text-orange-700 border-orange-300">
                              Unbesetzt
                            </Badge>
                          </div>
                        ))
                      )}
                      {unassignedShifts.length > 5 && (
                        <p className="text-sm text-muted-foreground text-center pt-2">
                          +{unassignedShifts.length - 5} weitere unbesetzte Schichten
                        </p>
                      )}
                      {unassignedShifts.length > 0 && (
                        <Button 
                          variant="outline" 
                          className="w-full mt-3" 
                          onClick={() => navigate('/scheduling')}
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Schichten zuweisen
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-slate-50 rounded-lg">
                        <Timer className={`h-8 w-8 mx-auto mb-2 ${overtimeHours > 0 ? 'text-warning' : 'text-success'}`} />
                        <p className="text-2xl font-bold">{overtimeHours}h</p>
                        <p className="text-sm text-muted-foreground">Überstunden diese Woche</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sollstunden:</span>
                          <span>40h</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Ist-Stunden:</span>
                          <span>42.5h</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-muted-foreground">Überstunden:</span>
                          <span className={overtimeHours > 0 ? 'text-warning' : 'text-success'}>
                            {overtimeHours > 0 ? '+' : ''}{overtimeHours}h
                          </span>
                        </div>
                      </div>
                      {overtimeHours > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-sm text-yellow-800">
                            💡 Tipp: Sprechen Sie mit Ihrem Manager über Freizeitausgleich
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* User Profile Component */}
              <div className="lg:row-span-2">
                <UserProfile />
              </div>
             
            </div>
          </TabsContent>

          <TabsContent value="activities">
            <Card>
              <CardHeader>
                <CardTitle>Letzte Aktivitäten</CardTitle>
                <CardDescription>
                  Echtzeitübersicht aller Teamaktivitäten
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-4 data-row p-2 rounded">
                      <span className="text-sm text-muted-foreground w-12">
                        {activity.time}
                      </span>
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'clock-in' ? 'bg-success' :
                        activity.type === 'shift' ? 'bg-primary' :
                        activity.type === 'vacation' ? 'bg-warning' :
                        'bg-muted'
                      }`} />
                      <span className="font-medium">{activity.user}</span>
                      <span className="text-sm text-muted-foreground">{activity.action}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

<TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Wöchentlicher Schichtplan</CardTitle>
                <CardDescription>
                  Ihre geplanten Schichten für diese Woche
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-2 text-center">
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, index) => (
                      <div key={day} className="p-2">
                        <p className="font-medium text-sm">{day}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(Date.now() + index * 24 * 60 * 60 * 1000).getDate()}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 7 }, (_, index) => (
                      <div key={index} className="space-y-1">
                        {index < 5 ? (
                          <div className="bg-blue-100 text-blue-800 text-xs p-1 rounded text-center">
                            Früh
                          </div>
                        ) : index === 5 ? (
                          <div className="bg-orange-100 text-orange-800 text-xs p-1 rounded text-center">
                            Spät
                          </div>
                        ) : (
                          <div className="bg-gray-100 text-gray-600 text-xs p-1 rounded text-center">
                            Frei
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => navigate('/scheduling')}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Vollständigen Schichtplan anzeigen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="team">
              <Card>
                <CardHeader>
                  <CardTitle>Team Übersicht</CardTitle>
                  <CardDescription>
                    Verwalten Sie Ihr Team und deren Arbeitszeiten
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4" />
                    <p>Teamverwaltung wird geladen...</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;