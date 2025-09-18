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
import { useRecentActivities } from "@/hooks/use-recent-activities";
import { useCompanyVacationRequests } from "@/hooks/use-company-data";
import { useCompanySchedules } from "@/hooks/use-company-data";
import { useCompanyTimeSlots } from "@/hooks/use-company-data";
import { useCompanyScheduleAssignments } from "@/hooks/use-company-data";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Clock, Play, Pause, TrendingUp, Users, Calendar, FileText, AlertTriangle, Timer, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInMinutes, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, startOfYear } from "date-fns";
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
  const { data: recentActivities = [], isLoading: activitiesLoading } = useRecentActivities();
  const { data: vacationRequests = [] } = useCompanyVacationRequests();
  const { data: timeSlots = [] } = useCompanyTimeSlots();
  const { data: scheduleAssignments = [] } = useCompanyScheduleAssignments();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<ActiveTimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  // New state for year-to-date overtime
  const [yearToDateOvertime, setYearToDateOvertime] = useState<number>(0);

  const MINUTES_PER_HOUR = 60;
  
  // Get employee's configured work hours from Settings
  const getEmployeeWorkHours = (): number => {
    if (!employee?.id) return 8;
    
    // Check if company has employee-specific work hours in settings with proper type checking
    if (company?.settings && typeof company.settings === 'object' && company.settings !== null && 'employee_work_hours' in company.settings) {
      const employeeWorkHours = company.settings.employee_work_hours;
      if (typeof employeeWorkHours === 'object' && employeeWorkHours !== null && employee.id in employeeWorkHours) {
        return employeeWorkHours[employee.id] as number;
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

  // Calculate year-to-date overtime
  const calculateYearToDateOvertime = (): number => {
    if (!employee?.id || !company?.created_at) return 0;
    
    // Determine the start date: either beginning of the year or company creation date, whichever is later
    const now = new Date();
    const yearStart = startOfYear(now);
    const companyCreationDate = new Date(company.created_at);
    const startDate = companyCreationDate > yearStart ? companyCreationDate : yearStart;
    
    // Filter time entries from start date to now
    const relevantEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.start_time);
      return entryDate >= startDate && entryDate <= now && entry.end_time;
    });
    
    // Calculate total worked minutes
    const totalWorkedMinutes = relevantEntries.reduce((total, entry) => {
      return total + calculateDurationInMinutes(entry.start_time, entry.end_time);
    }, 0);
    
    // Calculate expected work days (weekdays only)
    let expectedWorkDays = 0;
    const currentDate = new Date(startDate);
    const endDate = new Date(now);
    
    while (currentDate <= endDate) {
      // Check if it's a weekday (Monday-Friday)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek > 0 && dayOfWeek < 6) { // 0 = Sunday, 6 = Saturday
        expectedWorkDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Calculate expected work minutes
    const expectedWorkMinutes = expectedWorkDays * EMPLOYEE_WORK_MINUTES;
    
    // Return overtime (can be negative if worked less than expected)
    return totalWorkedMinutes - expectedWorkMinutes;
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

  // Format overtime display (with + or - sign)
  const formatOvertimeDisplay = (minutes: number): string => {
    if (minutes >= 0) {
      return `+${formatMinutesToHours(minutes)}`;
    } else {
      return `-${formatMinutesToHours(Math.abs(minutes))}`;
    }
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

  // Get unassigned shifts for the next 7 days
  const getUnassignedShifts = () => {
    if (!company?.id || timeSlots.length === 0) return [];
    
    const today = new Date();
    const unassignedShifts = [];
    
    // For each day in the next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      // For each time slot
      timeSlots.forEach(slot => {
        // Check if there's a schedule assignment for this date and slot
        const hasAssignment = scheduleAssignments.some((assignment: any) => {
          return assignment.scheduled_date === dateString && assignment.time_slot_id === slot.id;
        });
        
        // If no assignment, it's unassigned
        if (!hasAssignment) {
          unassignedShifts.push({
            id: `${slot.id}-${dateString}`,
            name: slot.name,
            time: `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}`,
            date: date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }),
            assigned: false
          });
        }
      });
    }
    
    return unassignedShifts;
  };

  // Calculate pending vacation requests for stats
  const pendingVacationRequests = vacationRequests.filter(req => req.status === 'pending').length;

  // Fetch data when employee changes
  useEffect(() => {
    if (employee?.id) {
      fetchTimeEntries();
      checkActiveEntry();
    }
  }, [employee?.id]);

  // Calculate year-to-date overtime when time entries or employee/company changes
  useEffect(() => {
    if (timeEntries.length > 0 && employee?.id && company?.created_at) {
      const ytdOvertime = calculateYearToDateOvertime();
      setYearToDateOvertime(ytdOvertime);
    }
  }, [timeEntries, employee?.id, company?.created_at]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate dynamic stats
  const getStats = () => {
    const unassignedShifts = isAdmin ? getUnassignedShifts() : [];
    const overtimeMinutes = calculateWeeklyOvertime();
    const todaysWorkMinutes = calculateTodaysWorkTime();
    
    return [
      {
        title: "Arbeitszeit heute",
        value: formatMinutesToTime(todaysWorkMinutes),
        icon: Clock,
        color: activeEntry ? "text-green-600" : "text-primary",
      },
      {
        title: isAdmin ? "Unbesetzte Schichten" : "Überstunden (Woche)",
        value: isAdmin ? unassignedShifts.length.toString() : formatMinutesToHours(overtimeMinutes),
        icon: isAdmin ? AlertTriangle : Timer,
        color: isAdmin ? (unassignedShifts.length > 0 ? "text-warning" : "text-success") : (overtimeMinutes > 0 ? "text-orange-600" : "text-success"),
      },
      {
        title: "Team Mitglieder",
        value: companyEmployees.length.toString(),
        icon: Users,
        color: "text-accent",
      },
      {
        title: "Offene Urlaubsanträge",
        value: pendingVacationRequests.toString(),
        icon: Calendar,
        color: "text-warning",
      },
      // New stat for year-to-date overtime
      {
        title: "Überstunden (YTD)",
        value: formatOvertimeDisplay(yearToDateOvertime),
        icon: TrendingUp,
        color: yearToDateOvertime >= 0 ? "text-green-600" : "text-red-600",
      },
    ];
  };

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
              Willkommen zurück{employee ? `, ${employee.first_name}` : ''}! Heute ist {currentTime.toLocaleDateString('de-DE', { 
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
            {activeEntry && (
              <p className="text-sm text-green-600 font-medium">
                Aktiv seit {format(new Date(activeEntry.start_time), 'HH:mm')}
              </p>
            )}
            <Button
              size="lg"
              variant={activeEntry ? "destructive" : "default"}
              onClick={handleClockToggle}
              className={`mt-2 ${activeEntry ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              disabled={loading}
            >
              {activeEntry ? (
                <>
                  <Square className="mr-2" />
                  Ausstempeln
                </>
              ) : (
                <>
                  <Play className="mr-2" />
                  Einstempeln
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {getStats().map((stat, index) => (
            <Card key={index} className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
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
                  {loading ? (
                    <div className="h-[200px] flex items-center justify-center">
                      <Clock className="h-6 w-6 animate-spin mr-2" />
                      <span>Lade Daten...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-lg font-bold text-blue-700">
                            {formatMinutesToHours(calculateWeeklyWorkTime())}
                          </p>
                          <p className="text-xs text-blue-600">Diese Woche</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-lg font-bold text-green-700">
                            {formatMinutesToHours(calculateTodaysWorkTime())}
                          </p>
                          <p className="text-xs text-green-600">Heute</p>
                        </div>
                      </div>
                      
                      {timeEntries.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Letzte Einträge:</p>
                          {timeEntries.slice(0, 3).map((entry) => (
                            <div key={entry.id} className="flex justify-between text-xs p-2 bg-gray-50 rounded">
                              <span>
                                {format(new Date(entry.start_time), 'dd.MM HH:mm', { locale: de })}
                                {!entry.end_time && ' (aktiv)'}
                              </span>
                              <span className={!entry.end_time ? 'text-green-600 font-medium' : ''}>
                                {entry.end_time ? 
                                  formatMinutesToHours(calculateDurationInMinutes(entry.start_time, entry.end_time)) :
                                  formatMinutesToHours(calculateDurationInMinutes(entry.start_time, null)) + ' (laufend)'
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Noch keine Zeiteinträge vorhanden</p>
                        </div>
                      )}
                    </div>
                  )}
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
                      {getUnassignedShifts().length === 0 ? (
                        <div className="text-center py-4">
                          <div className="text-green-600 mb-2">
                            <Users className="h-8 w-8 mx-auto" />
                          </div>
                          <p className="text-sm text-muted-foreground">Alle Schichten sind besetzt! 🎉</p>
                        </div>
                      ) : (
                        getUnassignedShifts().slice(0, 5).map((shift) => (
                          <div key={shift.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
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
                      {getUnassignedShifts().length > 5 && (
                        <p className="text-sm text-muted-foreground text-center pt-2">
                          +{getUnassignedShifts().length - 5} weitere unbesetzte Schichten
                        </p>
                      )}
                      {getUnassignedShifts().length > 0 && (
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
                        <Timer className={`h-8 w-8 mx-auto mb-2 ${calculateWeeklyOvertime() > 0 ? 'text-orange-600' : 'text-success'}`} />
                        <p className="text-2xl font-bold">{formatMinutesToHours(calculateWeeklyOvertime())}</p>
                        <p className="text-sm text-muted-foreground">Überstunden diese Woche</p>
                        {activeEntry && (
                          <div className="mt-2 p-2 bg-green-100 rounded">
                            <p className="text-xs text-green-700">
                              ⏱️ Aktive Sitzung: {formatMinutesToHours(calculateDurationInMinutes(activeEntry.start_time, null))}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sollstunden (Woche):</span>
                          <span>{EMPLOYEE_WORK_HOURS * 5}h</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Ist-Stunden (Woche):</span>
                          <span>{formatMinutesToHours(calculateWeeklyWorkTime())}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Heute gearbeitet:</span>
                          <span className={activeEntry ? 'text-green-600 font-medium' : ''}>
                            {formatMinutesToHours(calculateTodaysWorkTime())}
                            {activeEntry && ' (laufend)'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-muted-foreground">Überstunden:</span>
                          <span className={calculateWeeklyOvertime() > 0 ? 'text-orange-600' : 'text-success'}>
                            {calculateWeeklyOvertime() > 0 ? '+' : ''}{formatMinutesToHours(calculateWeeklyOvertime())}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-muted-foreground">Überstunden (YTD):</span>
                          <span className={yearToDateOvertime >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatOvertimeDisplay(yearToDateOvertime)}
                          </span>
                        </div>
                      </div>
                      {calculateWeeklyOvertime() > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-sm text-yellow-800">
                            💡 Tipp: {Math.floor(calculateWeeklyOvertime() / EMPLOYEE_WORK_MINUTES)} Tag(e) Freizeitausgleich verfügbar
                          </p>
                        </div>
                      )}
                      {activeEntry && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-green-800">Zeiterfassung aktiv</p>
                              <p className="text-xs text-green-700">
                                Gestartet: {format(new Date(activeEntry.start_time), 'dd.MM HH:mm', { locale: de })}
                              </p>
                              <p className="text-xs text-green-600">
                                Projekt: {activeEntry.project || 'Nicht angegeben'}
                              </p>
                            </div>
                            <Timer className="h-6 w-6 text-green-600 animate-pulse" />
                          </div>
                        </div>
                      )}
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => navigate('/time-tracking')}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Zur Zeiterfassung
                      </Button>
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
{activitiesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Clock className="h-6 w-6 animate-spin mr-2" />
                    <span>Lade Aktivitäten...</span>
                  </div>
                ) : recentActivities.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-4 data-row p-2 rounded">
                        <span className="text-sm text-muted-foreground w-12">
                          {activity.time}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${
                          activity.type === 'clock-in' ? 'bg-success' :
                          activity.type === 'clock-out' ? 'bg-success' :
                          activity.type === 'shift' ? 'bg-primary' :
                          activity.type === 'vacation' ? 'bg-warning' :
                          activity.type === 'schedule' ? 'bg-info' :
                          'bg-muted'
                        }`} />
                        <span className="font-medium">{activity.user}</span>
                        <span className="text-sm text-muted-foreground">{activity.action}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4" />
                    <p>Keine Aktivitäten gefunden</p>
                  </div>
                )}
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
                  {employee && scheduleAssignments && scheduleAssignments.length > 0 ? (
                    <>
                      <div className="grid grid-cols-7 gap-2 text-center">
                        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, index) => {
                          const date = new Date();
                          const dayDate = new Date(date.setDate(date.getDate() - date.getDay() + index + 1));
                          return (
                            <div key={day} className="p-2">
                              <p className="font-medium text-sm">{day}</p>
                              <p className="text-xs text-muted-foreground">
                                {dayDate.getDate()}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: 7 }, (_, index) => {
                          const date = new Date();
                          const dayDate = new Date(date.setDate(date.getDate() - date.getDay() + index + 1));
                          const dateString = dayDate.toISOString().split('T')[0];
                          
                          // Find assignments for this date
                          const dayAssignments = scheduleAssignments.filter((assignment: any) => 
                            assignment.employee_id === employee.id && 
                            assignment.scheduled_date === dateString
                          );
                          
                          return (
                            <div key={index} className="space-y-1">
                              {dayAssignments.length > 0 ? (
                                dayAssignments.map((assignment: any) => (
                                  <div 
                                    key={assignment.id} 
                                    className="bg-blue-100 text-blue-800 text-xs p-1 rounded text-center"
                                  >
                                    {assignment.time_slot?.name || 'Schicht'}
                                  </div>
                                ))
                              ) : (
                                <div className="bg-gray-100 text-gray-600 text-xs p-1 rounded text-center">
                                  Frei
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4" />
                      <p>Keine Schichtzuweisungen gefunden</p>
                      <p className="text-sm mt-2">Wenden Sie sich an Ihren Manager für Schichtinformationen</p>
                    </div>
                  )}
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