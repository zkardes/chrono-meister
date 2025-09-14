import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { withRetry, handleDatabaseError } from '@/lib/database-retry';

export type TimeEntry = Tables<'time_entries'>;

interface ActiveTimeEntry {
  id: string;
  start_time: string;
  description?: string;
  project?: string;
}

interface UseTimeTrackingResult {
  timeEntries: TimeEntry[];
  activeEntry: ActiveTimeEntry | null;
  loading: boolean;
  error: string | null;
  startTimeEntry: (description?: string, project?: string) => Promise<void>;
  stopTimeEntry: () => Promise<void>;
  createManualEntry: (entry: {
    startTime: string;
    endTime: string;
    description?: string;
    project?: string;
  }) => Promise<void>;
  refreshTimeEntries: () => Promise<void>;
  checkActiveEntry: () => Promise<void>;
}

export const useTimeTracking = (): UseTimeTrackingResult => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<ActiveTimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { employee } = useAuthContext();
  const { toast } = useToast();

  // Fetch time entries from database
  const refreshTimeEntries = async () => {
    if (!employee?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await withRetry(async () =>
        await supabase
          .from('time_entries')
          .select('*')
          .eq('employee_id', employee.id)
          .order('start_time', { ascending: false })
          .limit(100)
      );

      if (fetchError) {
        const errorMessage = handleDatabaseError(fetchError, 'fetch time entries');
        throw new Error(errorMessage);
      }

      setTimeEntries(data as TimeEntry[] || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch time entries';
      setError(errorMessage);
      console.error('Error fetching time entries:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check for active (uncompleted) time entry
  const checkActiveEntry = async () => {
    if (!employee?.id) return;

    try {
      const { data, error: fetchError } = await withRetry(async () =>
        await supabase
          .from('time_entries')
          .select('*')
          .eq('employee_id', employee.id)
          .is('end_time', null)
          .order('start_time', { ascending: false })
          .limit(1)
      );

      if (fetchError) {
        const errorMessage = handleDatabaseError(fetchError, 'check active entry');
        console.error('Error checking active entry:', errorMessage);
        return;
      }

      if (data && (data as TimeEntry[]).length > 0) {
        const entry = (data as TimeEntry[])[0];
        setActiveEntry({
          id: entry.id,
          start_time: entry.start_time,
          description: entry.description || '',
          project: entry.project || ''
        });
      } else {
        setActiveEntry(null);
      }
    } catch (err) {
      console.error('Error in checkActiveEntry:', err);
    }
  };

  // Start time tracking
  const startTimeEntry = async (description?: string, project?: string) => {
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
      
      const { data, error: insertError } = await withRetry(async () =>
        await supabase
          .from('time_entries')
          .insert({
            employee_id: employee.id,
            start_time: now,
            end_time: null,
            break_duration: 0,
            description: description || '',
            project: project || 'Allgemeine Arbeit',
            is_approved: false
          })
          .select()
          .single()
      );

      if (insertError) {
        const errorMessage = handleDatabaseError(insertError, 'start time entry');
        throw new Error(errorMessage);
      }

      setActiveEntry({
        id: (data as TimeEntry).id,
        start_time: (data as TimeEntry).start_time,
        description: (data as TimeEntry).description || '',
        project: (data as TimeEntry).project || ''
      });

      toast({
        title: "Zeit gestartet",
        description: "Ihre Zeiterfassung wurde gestartet.",
      });

      // Refresh time entries
      await refreshTimeEntries();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start time entry';
      setError(errorMessage);
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Stop time tracking
  const stopTimeEntry = async () => {
    if (!activeEntry) return;

    try {
      const now = new Date().toISOString();
      
      const { error: updateError } = await withRetry(async () =>
        await supabase
          .from('time_entries')
          .update({ end_time: now })
          .eq('id', activeEntry.id)
      );

      if (updateError) {
        const errorMessage = handleDatabaseError(updateError, 'stop time entry');
        throw new Error(errorMessage);
      }

      setActiveEntry(null);

      toast({
        title: "Ausgestempelt",
        description: "Ihre Zeiterfassung wurde gestoppt.",
      });

      // Refresh time entries
      await refreshTimeEntries();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop time entry';
      setError(errorMessage);
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Create manual time entry
  const createManualEntry = async (entry: {
    startTime: string;
    endTime: string;
    description?: string;
    project?: string;
  }) => {
    if (!employee?.id) {
      throw new Error('Employee required');
    }

    try {
      const { error: insertError } = await withRetry(async () =>
        await supabase
          .from('time_entries')
          .insert({
            employee_id: employee.id,
            start_time: entry.startTime,
            end_time: entry.endTime,
            break_duration: 0,
            description: entry.description || '',
            project: entry.project || 'Manueller Eintrag',
            is_approved: false
          })
      );

      if (insertError) {
        const errorMessage = handleDatabaseError(insertError, 'create manual entry');
        throw new Error(errorMessage);
      }

      toast({
        title: "Zeiteintrag hinzugefügt",
        description: "Der manuelle Zeiteintrag wurde erfolgreich gespeichert.",
      });

      // Refresh time entries
      await refreshTimeEntries();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create manual entry';
      setError(errorMessage);
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Load data when employee changes
  useEffect(() => {
    if (employee?.id) {
      refreshTimeEntries();
      checkActiveEntry();
    }
  }, [employee?.id]);

  return {
    timeEntries,
    activeEntry,
    loading,
    error,
    startTimeEntry,
    stopTimeEntry,
    createManualEntry,
    refreshTimeEntries,
    checkActiveEntry,
  };
};