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
import { executeWithRetry, handleDatabaseError } from '@/lib/database-retry';
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
  const { employee, company, user, loading: authLoading } = useAuthContext();
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

  // Fetch time entries from Supabase with retry mechanism
  const fetchTimeEntries = async () => {
    if (!employee?.id) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await executeWithRetry(
        async () => await supabase
          .from('time_entries')
          .select('*')
          .eq('employee_id', employee.id)
          .order('start_time', { ascending: false })
          .limit(50),
        'fetch time entries'
      );
        
      if (error) {
        const errorMessage = handleDatabaseError(error, 'fetch time entries');
        toast({
          title: "Fehler",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
      
      setTimeEntries((data as TimeEntry[]) || []);
    } catch (error) {
      console.error('Error in fetchTimeEntries:', error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check for active (uncompleted) time entry with retry mechanism
  const checkActiveEntry = async () => {
    if (!employee?.id) return;
    
    try {
      const { data, error } = await executeWithRetry(
        async () => await supabase
          .from('time_entries')
          .select('*')
          .eq('employee_id', employee.id)
          .is('end_time', null)
          .order('start_time', { ascending: false })
          .limit(1),
        'check active entry'
      );
        
      if (error) {
        console.error('Error checking active entry:', handleDatabaseError(error, 'check active entry'));
        return;
      }
      
      const timeEntryData = data as TimeEntry[];
      if (timeEntryData && timeEntryData.length > 0) {
        const entry = timeEntryData[0];
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

  // Start time tracking with retry mechanism
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
      
      const { data, error } = await executeWithRetry(
        async () => await supabase
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
          .single(),
        'start time entry'
      );
        
      if (error) {
        const errorMessage = handleDatabaseError(error, 'start time entry');
        toast({
          title: "Fehler",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
      
      const timeEntryData = data as TimeEntry;
      setActiveEntry({
        id: timeEntryData.id,
        start_time: timeEntryData.start_time,
        description: timeEntryData.description || '',
        project: timeEntryData.project || ''
      });
      
      toast({
        title: "Zeit gestartet",
        description: "Ihre Zeiterfassung wurde gestartet.",
      });
      
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

  // Stop time tracking with retry mechanism
  const handleStopTime = async () => {
    if (!activeEntry) return;

    try {
      const now = new Date().toISOString();
      
      const { error } = await executeWithRetry(
        async () => await supabase
          .from('time_entries')
          .update({ end_time: now })
          .eq('id', activeEntry.id),
        'stop time entry'
      );
        
      if (error) {
        const errorMessage = handleDatabaseError(error, 'stop time entry');
        toast({
          title: "Fehler",
          description: errorMessage,
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
    await handleStopTime();
    toast({
      title: "Pause gestartet",
      description: "Ihre Pause wurde gestartet. Drücken Sie 'Zeit starten' um fortzufahren.",
    });
  };

  // Create manual time entry with retry mechanism
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

      const { error } = await executeWithRetry(
        async () => await supabase
          .from('time_entries')
          .insert({
            employee_id: employee.id,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            break_duration: 0,
            description: manualEntry.description || '',
            project: manualEntry.project || 'Manueller Eintrag',
            is_approved: false
          }),
        'create manual entry'
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'create manual entry');
        toast({
          title: "Fehler",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Zeiteintrag hinzugefügt",
        description: "Der manuelle Zeiteintrag wurde erfolgreich gespeichert.",
      });

      setManualEntry({
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '',
        endTime: '',
        description: '',
        project: ''
      });

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

  const calculateDurationInMinutes = (startTime: string, endTime: string | null): number => {
    if (!endTime) return 0;
    return differenceInMinutes(new Date(endTime), new Date(startTime));
  };

  const formatMinutesToHours = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
    const minutes = totalMinutes % MINUTES_PER_HOUR;
    return `${hours}h ${minutes}min`;
  };

  const formatEntryDuration = (entry: TimeEntry): string => {
    if (!entry.end_time) {
      const minutes = differenceInMinutes(currentTime, new Date(entry.start_time));
      return `${formatMinutesToHours(minutes)} (laufend)`;
    }
    const minutes = calculateDurationInMinutes(entry.start_time, entry.end_time);
    return formatMinutesToHours(minutes);
  };

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
        <h1 className="text-3xl font-bold">Zeiterfassung</h1>
        
        {/* Quick Actions */}
        <Card>
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

        {/* Manual Entry */}
        <Card>
          <CardHeader>
            <CardTitle>Manueller Eintrag</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="manual-date">Datum</Label>
                <Input
                  id="manual-date"
                  type="date"
                  value={manualEntry.date}
                  onChange={(e) => setManualEntry({...manualEntry, date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="manual-project">Projekt</Label>
                <Input
                  id="manual-project"
                  placeholder="Projektname"
                  value={manualEntry.project}
                  onChange={(e) => setManualEntry({...manualEntry, project: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="manual-start">Startzeit</Label>
                <Input
                  id="manual-start"
                  type="time"
                  value={manualEntry.startTime}
                  onChange={(e) => setManualEntry({...manualEntry, startTime: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="manual-end">Endzeit</Label>
                <Input
                  id="manual-end"
                  type="time"
                  value={manualEntry.endTime}
                  onChange={(e) => setManualEntry({...manualEntry, endTime: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="manual-description">Beschreibung</Label>
              <Input
                id="manual-description"
                placeholder="Arbeitsbeschreibung"
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

        {/* Time Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Zeiteinträge</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Lade Einträge...</p>
            ) : timeEntries.length === 0 ? (
              <p>Keine Zeiteinträge vorhanden.</p>
            ) : (
              <div className="space-y-2">
                {timeEntries.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">
                        {format(new Date(entry.start_time), 'dd.MM.yyyy HH:mm')} - 
                        {entry.end_time ? format(new Date(entry.end_time), 'HH:mm') : 'Laufend'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {entry.project} • {formatEntryDuration(entry)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TimeTracking;