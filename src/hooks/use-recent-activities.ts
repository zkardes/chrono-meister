import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { withRetry, handleDatabaseError } from '@/lib/database-retry';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface RecentActivity {
  id: string;
  time: string;
  user: string;
  action: string;
  type: 'clock-in' | 'clock-out' | 'vacation' | 'shift' | 'break' | 'schedule';
  timestamp: Date;
}

export const useRecentActivities = () => {
  const { company } = useAuthContext();

  return useQuery({
    queryKey: ['recent-activities', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      try {
        // Fetch recent time entries with employee data
        const { data: timeEntriesData, error: timeEntriesError } = await withRetry(async () =>
          await supabase
            .from('time_entries')
            .select(`
              *,
              employee:employees!time_entries_employee_id_fkey(first_name, last_name)
            `)
            .eq('employee.company_id', company.id)
            .order('start_time', { ascending: false })
            .limit(20)
        );

        if (timeEntriesError) {
          const errorMessage = handleDatabaseError(timeEntriesError, 'fetch time entries');
          throw new Error(errorMessage);
        }

        // Fetch recent vacation requests with employee data
        const { data: vacationRequestsData, error: vacationRequestsError } = await withRetry(async () =>
          await supabase
            .from('vacation_requests')
            .select(`
              *,
              employee:employees!vacation_requests_employee_id_fkey(first_name, last_name)
            `)
            .eq('employee.company_id', company.id)
            .order('created_at', { ascending: false })
            .limit(10)
        );

        if (vacationRequestsError) {
          const errorMessage = handleDatabaseError(vacationRequestsError, 'fetch vacation requests');
          throw new Error(errorMessage);
        }

        // Fetch recent schedule assignments with employee data
        const { data: scheduleAssignmentsData, error: scheduleAssignmentsError } = await withRetry(async () =>
          await supabase
            .from('schedule_assignments')
            .select(`
              *,
              employee:employees!schedule_assignments_employee_id_fkey(first_name, last_name),
              time_slot:time_slots(name)
            `)
            .eq('employee.company_id', company.id)
            .order('created_at', { ascending: false })
            .limit(10)
        );

        if (scheduleAssignmentsError) {
          const errorMessage = handleDatabaseError(scheduleAssignmentsError, 'fetch schedule assignments');
          throw new Error(errorMessage);
        }

        // Combine and format all activities
        const activities: RecentActivity[] = [];

        // Process time entries
        (timeEntriesData || []).forEach((entry: any) => {
          const employeeName = `${entry.employee?.first_name || ''} ${entry.employee?.last_name || ''}`.trim() || 'Unknown';
          
          // Clock-in activity
          activities.push({
            id: `clock-in-${entry.id}`,
            time: format(new Date(entry.start_time), 'HH:mm', { locale: de }),
            user: employeeName,
            action: 'Eingestempelt',
            type: 'clock-in',
            timestamp: new Date(entry.start_time)
          });

          // Clock-out activity
          if (entry.end_time) {
            activities.push({
              id: `clock-out-${entry.id}`,
              time: format(new Date(entry.end_time), 'HH:mm', { locale: de }),
              user: employeeName,
              action: 'Ausgestempelt',
              type: 'clock-out',
              timestamp: new Date(entry.end_time)
            });
          }
        });

        // Process vacation requests
        (vacationRequestsData || []).forEach((request: any) => {
          const employeeName = `${request.employee?.first_name || ''} ${request.employee?.last_name || ''}`.trim() || 'Unknown';
          
          activities.push({
            id: `vacation-${request.id}`,
            time: format(new Date(request.created_at), 'HH:mm', { locale: de }),
            user: employeeName,
            action: `Urlaubsantrag eingereicht (${request.days_requested} Tage)`,
            type: 'vacation',
            timestamp: new Date(request.created_at)
          });
        });

        // Process schedule assignments
        (scheduleAssignmentsData || []).forEach((assignment: any) => {
          const employeeName = `${assignment.employee?.first_name || ''} ${assignment.employee?.last_name || ''}`.trim() || 'Unknown';
          const timeSlotName = assignment.time_slot?.name || 'Unbekannte Schicht';
          
          activities.push({
            id: `schedule-${assignment.id}`,
            time: format(new Date(assignment.created_at), 'HH:mm', { locale: de }),
            user: employeeName,
            action: `Schichtzuweisung: ${timeSlotName}`,
            type: 'schedule',
            timestamp: new Date(assignment.created_at)
          });
        });

        // Sort all activities by timestamp (newest first) and take the 10 most recent
        return activities
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 10);
      } catch (error) {
        console.error('Error fetching recent activities:', error);
        throw error;
      }
    },
    enabled: !!company?.id,
  });
};