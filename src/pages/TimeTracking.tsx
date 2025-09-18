import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Play, Pause, Coffee, Plus, Download, Timer, Square, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { executeWithRetry, handleDatabaseError } from '@/lib/database-retry';
import { format, parseISO, differenceInMinutes, startOfDay, endOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [entryToDelete, setEntryToDelete] = useState<TimeEntry | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
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
        .limit(50);
        
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

  // Delete time entry - simplified with RLS policy handling
  const handleDeleteEntry = async () => {
    if (!entryToDelete || !employee?.id) {
      console.log('Cannot delete: missing entry or employee');
      return;
    }
    
    try {
      console.log('Attempting to delete time entry with ID:', entryToDelete.id);
      
      // Simple delete operation with proper error handling
      const { data, error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryToDelete.id);

      if (error) {
        console.error('Delete failed:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        toast({
          title: "Fehler",
          description: `Löschen fehlgeschlagen: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Delete successful for entry:', entryToDelete.id);
      console.log('Delete response data:', data);
      
      // Verify the entry was actually deleted
      const { data: verifyData, error: verifyError } = await supabase
        .from('time_entries')
        .select('id')
        .eq('id', entryToDelete.id);
      
      if (verifyError) {
        console.error('Verification failed:', verifyError);
      } else if (verifyData && verifyData.length > 0) {
        console.error('Entry still exists after delete operation');
        toast({
          title: "Fehler",
          description: "Der Zeiteintrag wurde nicht gelöscht. Bitte versuchen Sie es erneut.",
          variant: "destructive",
        });
        // Refresh data to show current state
        await fetchTimeEntries();
        return;
      } else {
        console.log('Entry successfully deleted and verified');
        toast({
          title: "Zeiteintrag gelöscht",
          description: "Der Zeiteintrag wurde erfolgreich gelöscht.",
        });
      }

      // Update UI and refresh data
      setTimeEntries(prev => prev.filter(entry => entry.id !== entryToDelete.id));
      setEntryToDelete(null);
      setIsDeleteDialogOpen(false);
      
      // Refresh the data to ensure consistency
      await fetchTimeEntries();
    } catch (error) {
      console.error('Delete operation error:', error);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    }
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

  // Comprehensive test function for DELETE policy
  const comprehensiveDeleteTest = async () => {
    console.log('=== Comprehensive DELETE Policy Test ===');
    
    try {
      // 1. Check current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('1. User check failed:', userError);
        return;
      }
      console.log('1. Current user:', user?.id);
      
      // 2. Create a test time entry
      console.log('2. Creating test time entry...');
      const testEntry = {
        employee_id: employee?.id,
        start_time: new Date().toISOString(),
        description: 'Test entry for DELETE policy verification',
        project: 'Test Project'
      };
      
      const { data: createdEntry, error: createError } = await supabase
        .from('time_entries')
        .insert(testEntry)
        .select()
        .single();
      
      if (createError) {
        console.error('2. Failed to create test entry:', createError);
        return;
      }
      console.log('2. Test entry created:', createdEntry.id);
      
      // 3. Verify the entry exists
      console.log('3. Verifying entry exists...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('id', createdEntry.id);
      
      if (verifyError) {
        console.error('3. Failed to verify entry:', verifyError);
        return;
      }
      console.log('3. Entry verification:', verifyData.length > 0 ? 'SUCCESS' : 'FAILED');
      
      // 4. Attempt to delete the entry
      console.log('4. Attempting to delete entry...');
      const { error: deleteError } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', createdEntry.id);
      
      if (deleteError) {
        console.error('4. DELETE operation failed:', deleteError);
        console.log('❌ DELETE policy test: FAILED');
        return;
      }
      console.log('4. DELETE operation: SUCCESS');
      
      // 5. Verify the entry was deleted
      console.log('5. Verifying entry was deleted...');
      const { data: verifyDeletedData, error: verifyDeletedError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('id', createdEntry.id);
      
      if (verifyDeletedError) {
        console.error('5. Failed to verify deletion:', verifyDeletedError);
        return;
      }
      
      if (verifyDeletedData.length === 0) {
        console.log('5. Entry deletion verification: SUCCESS');
        console.log('✅ DELETE policy test: PASSED');
      } else {
        console.log('5. Entry deletion verification: FAILED - Entry still exists');
        console.log('❌ DELETE policy test: FAILED');
      }
      
    } catch (error) {
      console.error('Unexpected error during test:', error);
    }
  };

  // Simple test function that can be called from browser console
  const simpleDeleteTest = async () => {
    console.log('Running simple delete test...');
    
    // Get the first time entry
    const { data: entries, error: fetchError } = await supabase
      .from('time_entries')
      .select('*')
      .limit(1);
    
    if (fetchError) {
      console.error('Error fetching entries:', fetchError);
      return;
    }
    
    if (!entries || entries.length === 0) {
      console.log('No entries found to test delete operation');
      return;
    }
    
    const entryId = entries[0].id;
    console.log('Testing delete on entry:', entryId);
    
    // Try to delete the entry
    const { error: deleteError } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', entryId);
    
    if (deleteError) {
      console.error('Delete failed:', deleteError);
    } else {
      console.log('Delete successful!');
    }
  };

  // Test delete function - for debugging purposes
  const testDeleteEntry = async (entryId: string) => {
    console.log('Testing delete for entry:', entryId);
    
    // First, check if entry exists
    const { data: checkData, error: checkError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', entryId);
    
    console.log('Check result:', { checkData, checkError });
    
    if (checkData && checkData.length > 0) {
      console.log('Entry found, attempting delete');
      
      // Try to delete
      const { data, error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId);
      
      console.log('Delete result:', { data, error });
      
      // Check again
      const { data: verifyData, error: verifyError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('id', entryId);
      
      console.log('Verify result:', { verifyData, verifyError });
    }
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
                {timeEntries.slice(0, 10).map((entry) => {
                  const duration = entry.end_time 
                    ? calculateDurationInMinutes(entry.start_time, entry.end_time)
                    : differenceInMinutes(currentTime, new Date(entry.start_time));
                  
                  return (
                    <div key={entry.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <p className="font-medium">
                          {format(new Date(entry.start_time), 'dd.MM.yyyy HH:mm')} - 
                          {entry.end_time ? format(new Date(entry.end_time), 'HH:mm') : 'Laufend'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {entry.project} • {formatMinutesToHours(duration)}
                          {duration === 0 && entry.end_time && (
                            <span className="ml-2 text-red-500">(0 Minuten)</span>
                          )}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setEntryToDelete(entry);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zeiteintrag löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {entryToDelete && (
                <>
                  Sind Sie sicher, dass Sie den folgenden Zeiteintrag löschen möchten?
                  <div className="mt-2 p-2 bg-gray-100 rounded">
                    <p className="font-medium">
                      {format(new Date(entryToDelete.start_time), 'dd.MM.yyyy HH:mm')} - 
                      {entryToDelete.end_time ? format(new Date(entryToDelete.end_time), 'HH:mm') : 'Laufend'}
                    </p>
                    <p className="text-sm">
                      {entryToDelete.project || 'Kein Projekt'} • {entryToDelete.description || 'Keine Beschreibung'}
                    </p>
                  </div>
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteEntry}
              className="bg-red-600 hover:bg-red-700"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default TimeTracking;
