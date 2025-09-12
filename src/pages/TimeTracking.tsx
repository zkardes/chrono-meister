import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Play, Pause, Coffee, Plus, Download, Timer, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, differenceInMinutes, startOfDay, endOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type TimeEntry = Tables<'time_entries'>;

interface ActiveTimeEntry {
  id: string;
  start_time: string;
  description?: string;
  project?: string;
}

const TimeTracking = () => {
  const { toast } = useToast();
  const { employee, user, loading: authLoading } = useAuthContext();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEntry, setActiveEntry] = useState<ActiveTimeEntry | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Manual entry form state
  const [manualEntry, setManualEntry] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '',
    endTime: '',
    description: '',
    project: ''
  });
  
  const MINUTES_PER_HOUR = 60;
  
  // Get employee's configured work hours from Settings (fallback to 8 hours)
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
    // Default to 8 hours if no setting found
    return 8;
  };
  
  const EMPLOYEE_WORK_HOURS = getEmployeeWorkHours();
  const EMPLOYEE_WORK_MINUTES = EMPLOYEE_WORK_HOURS * MINUTES_PER_HOUR;

  // Update current time every second for active timer display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Fetch time entries when component mounts or employee changes
  useEffect(() => {
    if (employee?.id) {
      fetchTimeEntries();
      checkActiveEntry();
    }
  }, [employee?.id]);

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
        .limit(50); // Limit to recent 50 entries
        
      if (error) {
        console.error('Error fetching time entries:', error);
        toast({
          title: "Fehler",
          description: "Zeiteinträge konnten nicht geladen werden.",
          variant: "destructive",
        });
        return;
      }
      
      setTimeEntries(data || []);
    } catch (error) {
      console.error('Error in fetchTimeEntries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check for active (uncompleted) time entry
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

  // Start time tracking
  const handleStartTime = async () => {
    if (!employee?.id) {
      toast({
        title: "Fehler",
        description: "Kein Mitarbeiter gefunden. Bitte melden Sie sich erneut an.",
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
          project: 'Allgemeine Arbeit',
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
        title: "Zeit gestartet",
        description: "Ihre Zeiterfassung wurde gestartet.",
      });
      
      // Refresh time entries
      fetchTimeEntries();
    } catch (error) {
      console.error('Error in handleStartTime:', error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    }
  };

  // Stop time tracking
  const handleStopTime = async () => {
    if (!activeEntry) return;

    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: now
        })
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
      
      const duration = differenceInMinutes(new Date(now), new Date(activeEntry.start_time));
      
      setActiveEntry(null);
      
      toast({
        title: "Zeit gestoppt",
        description: `Arbeitszeit: ${formatMinutesToHours(duration)}`,
      });
      
      // Refresh time entries
      fetchTimeEntries();
    } catch (error) {
      console.error('Error in handleStopTime:', error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    }
  };

  // Start break (pause)
  const handleStartBreak = async () => {
    // For now, we'll just stop the current time and start a new one after break
    // In a more sophisticated system, you might track breaks separately
    await handleStopTime();
    
    toast({
      title: "Pause gestartet",
      description: "Ihre Pause wurde gestartet. Drücken Sie 'Zeit starten' um fortzufahren.",
    });
  };

  // Calculate duration in minutes between start and end time
  const calculateDurationInMinutes = (startTime: string, endTime: string | null): number => {
    if (!endTime) return 0;
    return differenceInMinutes(new Date(endTime), new Date(startTime));
  };

  // Calculate daily worked minutes for a specific date
  const calculateDailyWorkedMinutes = (date: string): number => {
    const dayStart = startOfDay(new Date(date));
    const dayEnd = endOfDay(new Date(date));
    
    return timeEntries
      .filter(entry => {
        const entryDate = new Date(entry.start_time);
        return entryDate >= dayStart && entryDate <= dayEnd && entry.end_time;
      })
      .reduce((total, entry) => {
        return total + calculateDurationInMinutes(entry.start_time, entry.end_time);
      }, 0);
  };

  // Calculate overtime for a specific date
  const calculateDailyOvertime = (date: string): number => {
    const workedMinutes = calculateDailyWorkedMinutes(date);
    const overtimeMinutes = Math.max(0, workedMinutes - EMPLOYEE_WORK_MINUTES);
    return overtimeMinutes;
  };

  // Get all unique dates from time entries
  const getUniqueDates = (): string[] => {
    const dates = timeEntries
      .map(entry => format(new Date(entry.start_time), 'yyyy-MM-dd'))
      .filter((date, index, self) => self.indexOf(date) === index);
    return dates.sort().reverse(); // Most recent first
  };

  // Calculate total overtime across all days
  const calculateTotalOvertime = (): { hours: number; minutes: number } => {
    const uniqueDates = getUniqueDates();
    const totalOvertimeMinutes = uniqueDates.reduce((total, date) => {
      return total + calculateDailyOvertime(date);
    }, 0);
    
    const hours = Math.floor(totalOvertimeMinutes / MINUTES_PER_HOUR);
    const minutes = totalOvertimeMinutes % MINUTES_PER_HOUR;
    
    return { hours, minutes };
  };

  // Calculate available overtime days (employee's work hours = 1 day)
  const calculateOvertimeDays = (): number => {
    const { hours } = calculateTotalOvertime();
    return Math.floor(hours / EMPLOYEE_WORK_HOURS);
  };

  // Format minutes to hours and minutes display
  const formatMinutesToHours = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
    const minutes = totalMinutes % MINUTES_PER_HOUR;
    return `${hours}h ${minutes}min`;
  };

  // Format duration for display
  const formatEntryDuration = (entry: TimeEntry): string => {
    if (!entry.end_time) {
      // If no end time, calculate from start to now
      const minutes = differenceInMinutes(currentTime, new Date(entry.start_time));
      return `${formatMinutesToHours(minutes)} (laufend)`;
    }
    const minutes = calculateDurationInMinutes(entry.start_time, entry.end_time);
    return formatMinutesToHours(minutes);
  };

  // Handle manual entry submission
  const handleManualEntry = async () => {
    if (!employee?.id) {
      toast({
        title: "Fehler",
        description: "Kein Mitarbeiter gefunden.",
        variant: "destructive",
      });
      return;
    }

    if (!manualEntry.date || !manualEntry.startTime || !manualEntry.endTime) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Pflichtfelder aus.",
        variant: "destructive",
      });
      return;
    }

    try {
      const startDateTime = new Date(`${manualEntry.date}T${manualEntry.startTime}:00`);
      const endDateTime = new Date(`${manualEntry.date}T${manualEntry.endTime}:00`);

      if (endDateTime <= startDateTime) {
        toast({
          title: "Fehler",
          description: "Die Endzeit muss nach der Startzeit liegen.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('time_entries')
        .insert({
          employee_id: employee.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          break_duration: 0,
          description: manualEntry.description || '',
          project: manualEntry.project || 'Manueller Eintrag',
          is_approved: false
        });

      if (error) {
        console.error('Error creating manual entry:', error);
        toast({
          title: "Fehler",
          description: "Zeiteintrag konnte nicht erstellt werden.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Zeiteintrag hinzugefügt",
        description: "Der manuelle Zeiteintrag wurde erfolgreich gespeichert.",
      });

      // Reset form
      setManualEntry({
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '',
        endTime: '',
        description: '',
        project: ''
      });

      // Refresh time entries
      fetchTimeEntries();
    } catch (error) {
      console.error('Error in handleManualEntry:', error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    }
  };

  // Handle export functionality
  const handleExport = () => {
    if (timeEntries.length === 0) {
      toast({
        title: "Keine Daten",
        description: "Es sind keine Zeiteinträge zum Exportieren vorhanden.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = ['Datum', 'Startzeit', 'Endzeit', 'Dauer', 'Beschreibung', 'Projekt'];
    const csvContent = [
      headers.join(','),
      ...timeEntries.map(entry => {
        const date = format(new Date(entry.start_time), 'dd.MM.yyyy');
        const startTime = format(new Date(entry.start_time), 'HH:mm');
        const endTime = entry.end_time ? format(new Date(entry.end_time), 'HH:mm') : 'Laufend';
        const duration = entry.end_time ? formatMinutesToHours(calculateDurationInMinutes(entry.start_time, entry.end_time)) : 'Laufend';
        const description = entry.description || '';
        const project = entry.project || '';
        
        return [date, startTime, endTime, duration, `"${description}"`, `"${project}"`].join(',');
      })
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `zeiterfassung_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    toast({
      title: "Export gestartet",
      description: "Ihre Zeiterfassungsdaten werden heruntergeladen.",
    });
  };

  const totalOvertime = calculateTotalOvertime();
  const availableOvertimeDays = calculateOvertimeDays();

  // Show loading state while auth is loading or employee data is not available
  if (authLoading || !employee) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Lade Zeiterfassungsdaten...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Zeiterfassung</h1>
            <p className="text-muted-foreground">
              Verwalten Sie Ihre Arbeitszeiten und Projekte
            </p>
          </div>
          <Button onClick={handleExport} disabled={timeEntries.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        <div className="grid gap-8 md:grid-cols-4">
          {/* Quick Actions */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Schnellaktionen</CardTitle>
              <CardDescription>
                {activeEntry ? "Zeiterfassung läuft" : "Starten Sie die Zeiterfassung"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeEntry && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-800">Aktive Zeiterfassung</p>
                      <p className="text-sm text-green-700">
                        Gestartet: {format(new Date(activeEntry.start_time), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </p>
                      <p className="text-sm text-green-600">
                        Dauer: {formatMinutesToHours(differenceInMinutes(currentTime, new Date(activeEntry.start_time)))}
                      </p>
                    </div>
                    <Timer className="h-8 w-8 text-green-600 animate-pulse" />
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                {!activeEntry ? (
                  <Button 
                    size="lg" 
                    className="h-48 bg-green-600 hover:bg-green-700"
                    onClick={handleStartTime}
                  >
                    <Play className="mr-2" />
                    Zeit starten
                  </Button>
                ) : (
                  <Button 
                    size="lg" 
                    variant="destructive" 
                    className="h-48"
                    onClick={handleStopTime}
                  >
                    <Square className="mr-2" />
                    Zeit stoppen
                  </Button>
                )}
                
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="h-48"
                  onClick={handleStartBreak}
                  disabled={!activeEntry}
                >
                  <Coffee className="mr-2" />
                  Pause beginnen
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Kalender</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full max-w-full overflow-hidden">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time Entries */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">Zeiteinträge</TabsTrigger>
            <TabsTrigger value="manual">Manueller Eintrag</TabsTrigger>
            <TabsTrigger value="statistics">Statistiken</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Ihre Zeiteinträge</CardTitle>
                <CardDescription>
                  Übersicht aller erfassten Arbeitszeiten ({timeEntries.length} Einträge)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Clock className="h-6 w-6 animate-spin mr-2" />
                    <span>Lade Zeiteinträge...</span>
                  </div>
                ) : timeEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Noch keine Zeiteinträge vorhanden</p>
                    <p className="text-sm text-muted-foreground">Starten Sie Ihre erste Zeiterfassung!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {timeEntries.map((entry) => {
                      const entryDate = format(new Date(entry.start_time), 'yyyy-MM-dd');
                      const dailyOvertime = calculateDailyOvertime(entryDate);
                      const isOvertimeDay = dailyOvertime > 0;
                      const isActive = !entry.end_time;
                      
                      return (
                        <div key={entry.id} className={`flex items-center justify-between p-3 rounded-lg hover:bg-muted border ${
                          isActive ? 'border-green-200 bg-green-50/50' : 
                          isOvertimeDay ? 'border-orange-200 bg-orange-50/50' : ''
                        }`}>
                          <div className="flex items-center gap-4">
                            {isActive ? (
                              <Timer className="h-4 w-4 text-green-600 animate-pulse" />
                            ) : (
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(entry.start_time), "dd.MM.yyyy • HH:mm", { locale: de })} - 
                                {entry.end_time ? format(new Date(entry.end_time), "HH:mm", { locale: de }) : "Laufend"}
                              </p>
                              {entry.description && (
                                <p className="text-xs text-muted-foreground">{entry.description}</p>
                              )}
                              {entry.project && (
                                <p className="text-xs text-blue-600">{entry.project}</p>
                              )}
                              {isOvertimeDay && !isActive && (
                                <p className="text-xs text-orange-600 font-medium">
                                  <Timer className="h-3 w-3 inline mr-1" />
                                  +{formatMinutesToHours(dailyOvertime)} Überstunden
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${
                              isActive ? 'text-green-600' : ''
                            }`}>
                              {formatEntryDuration(entry)}
                            </p>
                            {isActive && (
                              <p className="text-xs text-green-600">Aktiv</p>
                            )}
                            {isOvertimeDay && !isActive && (
                              <p className="text-xs text-orange-600">Überstunden-Tag</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle>Manueller Zeiteintrag</CardTitle>
                <CardDescription>
                  Fügen Sie nachträglich Arbeitszeiten hinzu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Input 
                    type="date" 
                    value={manualEntry.date}
                    onChange={(e) => setManualEntry({...manualEntry, date: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Startzeit</Label>
                    <Input 
                      type="time" 
                      value={manualEntry.startTime}
                      onChange={(e) => setManualEntry({...manualEntry, startTime: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Endzeit</Label>
                    <Input 
                      type="time" 
                      value={manualEntry.endTime}
                      onChange={(e) => setManualEntry({...manualEntry, endTime: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Projekt</Label>
                  <Input 
                    placeholder="z.B. Allgemeine Arbeit, Projekt XY"
                    value={manualEntry.project}
                    onChange={(e) => setManualEntry({...manualEntry, project: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Beschreibung</Label>
                  <Input 
                    placeholder="Optionale Beschreibung der Tätigkeit"
                    value={manualEntry.description}
                    onChange={(e) => setManualEntry({...manualEntry, description: e.target.value})}
                  />
                </div>
                <Button onClick={handleManualEntry}>
                  <Plus className="mr-2 h-4 w-4" />
                  Eintrag hinzufügen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics">
            <Card>
              <CardHeader>
                <CardTitle>Statistiken</CardTitle>
                <CardDescription>
                  Analyse Ihrer Arbeitszeiten
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Diese Woche</p>
                    <p className="text-2xl font-bold">
                      {formatMinutesToHours(
                        timeEntries
                          .filter(entry => {
                            const entryDate = new Date(entry.start_time);
                            const now = new Date();
                            const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                            return entryDate >= weekStart && entry.end_time;
                          })
                          .reduce((total, entry) => 
                            total + calculateDurationInMinutes(entry.start_time, entry.end_time), 0
                          )
                      )}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Dieser Monat</p>
                    <p className="text-2xl font-bold">
                      {formatMinutesToHours(
                        timeEntries
                          .filter(entry => {
                            const entryDate = new Date(entry.start_time);
                            const now = new Date();
                            return entryDate.getMonth() === now.getMonth() && 
                                   entryDate.getFullYear() === now.getFullYear() && 
                                   entry.end_time;
                          })
                          .reduce((total, entry) => 
                            total + calculateDurationInMinutes(entry.start_time, entry.end_time), 0
                          )
                      )}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Gesamte Überstunden</p>
                    <p className={`text-2xl font-bold ${
                      totalOvertime.hours > 0 ? 'text-orange-600' : 'text-gray-600'
                    }`}>
                      {totalOvertime.hours}h {totalOvertime.minutes}min
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Verfügbare freie Tage</p>
                    <p className={`text-2xl font-bold ${
                      availableOvertimeDays > 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {availableOvertimeDays}
                    </p>
                  </div>
                </div>
                
                {/* Employee Work Hours Info */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-blue-800">Ihre Arbeitszeit-Konfiguration</h4>
                      <p className="text-sm text-blue-700">
                        Tägliche Arbeitszeit: {EMPLOYEE_WORK_HOURS}h ({EMPLOYEE_WORK_MINUTES} Minuten)
                      </p>
                      <p className="text-xs text-blue-600">
                        Konfigurierbar in den Einstellungen
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                
                {/* Overtime Summary */}
                {totalOvertime.hours > 0 && (
                  <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-orange-800">Überstunden-Zusammenfassung</h4>
                        <p className="text-sm text-orange-700">
                          Sie haben {totalOvertime.hours}h {totalOvertime.minutes}min Überstunden angesammelt.
                        </p>
                        {availableOvertimeDays > 0 && (
                          <p className="text-sm text-green-700 font-medium">
                            ✓ {availableOvertimeDays} freie Tag(e) für Überstundenausgleich verfügbar
                          </p>
                        )}
                        {totalOvertime.hours >= (EMPLOYEE_WORK_HOURS / 2) && totalOvertime.hours < EMPLOYEE_WORK_HOURS && (
                          <p className="text-sm text-orange-600">
                            Noch {EMPLOYEE_WORK_HOURS - totalOvertime.hours}h bis zum nächsten freien Tag
                          </p>
                        )}
                      </div>
                      <Timer className="h-8 w-8 text-orange-600" />
                    </div>
                  </div>
                )}
                
                {/* Active Timer Info */}
                {activeEntry && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-green-800">Aktuelle Sitzung</h4>
                        <p className="text-sm text-green-700">
                          Gestartet: {format(new Date(activeEntry.start_time), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </p>
                        <p className="text-sm text-green-600">
                          Aktuelle Dauer: {formatMinutesToHours(differenceInMinutes(currentTime, new Date(activeEntry.start_time)))}
                        </p>
                      </div>
                      <Timer className="h-8 w-8 text-green-600 animate-pulse" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TimeTracking;