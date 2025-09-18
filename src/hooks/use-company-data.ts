import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';
import { withRetry, handleDatabaseError } from '@/lib/database-retry';

type Employee = Tables<'employees'>;
type Group = Tables<'groups'>;
type TimeEntry = Tables<'time_entries'>;
type VacationRequest = Tables<'vacation_requests'>;
type Schedule = Tables<'schedules'>;
type TimeSlot = Tables<'time_slots'>;
type ScheduleAssignment = Tables<'schedule_assignments'>;

// Hook to get employees from current company
export const useCompanyEmployees = () => {
  const { company } = useAuthContext();

  return useQuery({
    queryKey: ['company-employees', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await withRetry(async () =>
        await supabase
          .from('employees')
          .select('*')
          .eq('company_id', company.id)
          .eq('is_active', true)
          .order('first_name')
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'fetch company employees');
        throw new Error(errorMessage);
      }
      return data as Employee[];
    },
    enabled: !!company?.id,
  });
};

// Hook to get groups from current company
export const useCompanyGroups = () => {
  const { company } = useAuthContext();

  return useQuery({
    queryKey: ['company-groups', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await withRetry(async () =>
        await supabase
          .from('groups')
          .select(`
            *,
            manager:employees!groups_manager_id_fkey(first_name, last_name)
          `)
          .eq('company_id', company.id)
          .order('name')
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'fetch company groups');
        throw new Error(errorMessage);
      }
      return data as (Group & { manager: Pick<Employee, 'first_name' | 'last_name'> | null })[];
    },
    enabled: !!company?.id,
  });
};

// Hook to get time entries from current company
export const useCompanyTimeEntries = (startDate?: string, endDate?: string) => {
  const { company, employee } = useAuthContext();

  return useQuery({
    queryKey: ['company-time-entries', company?.id, startDate, endDate],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await withRetry(async () => {
        let query = supabase
          .from('time_entries')
          .select(`
            *,
            employee:employees!time_entries_employee_id_fkey(first_name, last_name, company_id)
          `)
          .order('start_time', { ascending: false });

        if (startDate) {
          query = query.gte('start_time', startDate);
        }
        if (endDate) {
          query = query.lte('start_time', endDate);
        }

        return query;
      });

      if (error) {
        const errorMessage = handleDatabaseError(error, 'fetch company time entries');
        throw new Error(errorMessage);
      }

      // Filter by company on the client side as an extra security measure
      return (data as (TimeEntry & { employee: Employee | null })[])
        .filter(entry => entry.employee?.company_id === company.id);
    },
    enabled: !!company?.id,
  });
};

// Hook to get vacation requests from current company
export const useCompanyVacationRequests = () => {
  const { company, isAdmin } = useAuthContext();

  return useQuery({
    queryKey: ['company-vacation-requests', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await withRetry(async () =>
        await supabase
          .from('vacation_requests')
          .select(`
            *,
            employee:employees!vacation_requests_employee_id_fkey(first_name, last_name, company_id)
          `)
          .order('created_at', { ascending: false })
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'fetch company vacation requests');
        throw new Error(errorMessage);
      }

      // Filter by company on the client side as an extra security measure
      return (data as (VacationRequest & { employee: Employee | null })[])
        .filter(request => request.employee?.company_id === company.id);
    },
    enabled: !!company?.id,
  });
};

// Hook to get schedules from current company
export const useCompanySchedules = (startDate?: string, endDate?: string) => {
  const { company } = useAuthContext();

  return useQuery({
    queryKey: ['company-schedules', company?.id, startDate, endDate],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await withRetry(async () => {
        let query = supabase
          .from('schedules')
          .select(`
            *,
            employee:employees!schedules_employee_id_fkey(first_name, last_name, company_id)
          `)
          .order('date');

        if (startDate) {
          query = query.gte('date', startDate);
        }
        if (endDate) {
          query = query.lte('date', endDate);
        }

        return query;
      });

      if (error) {
        const errorMessage = handleDatabaseError(error, 'fetch company schedules');
        throw new Error(errorMessage);
      }

      // Filter by company on the client side as an extra security measure
      return (data as (Schedule & { employee: Employee | null })[])
        .filter(schedule => schedule.employee?.company_id === company.id);
    },
    enabled: !!company?.id,
  });
};

// Hook to get time slots from current company
export const useCompanyTimeSlots = () => {
  const { company } = useAuthContext();

  return useQuery({
    queryKey: ['company-time-slots', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await withRetry(async () =>
        await supabase
          .from('time_slots')
          .select('*')
          .eq('company_id', company.id)
          .order('start_time')
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'fetch company time slots');
        throw new Error(errorMessage);
      }
      return data as TimeSlot[];
    },
    enabled: !!company?.id,
  });
};

// Hook to get schedule assignments from current company
export const useCompanyScheduleAssignments = (startDate?: string, endDate?: string) => {
  const { company } = useAuthContext();

  return useQuery({
    queryKey: ['company-schedule-assignments', company?.id, startDate, endDate],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await withRetry(async () => {
        let query = supabase
          .from('schedule_assignments')
          .select(`
            *,
            employee:employees!schedule_assignments_employee_id_fkey(first_name, last_name, company_id),
            time_slot:time_slots(name, start_time, end_time)
          `)
          .eq('company_id', company.id)
          .order('scheduled_date');

        if (startDate) {
          query = query.gte('scheduled_date', startDate);
        }
        if (endDate) {
          query = query.lte('scheduled_date', endDate);
        }

        return query;
      });

      if (error) {
        const errorMessage = handleDatabaseError(error, 'fetch company schedule assignments');
        throw new Error(errorMessage);
      }

      return data as ScheduleAssignment[];
    },
    enabled: !!company?.id,
  });
};

// Hook to get current user's employee record
export const useCurrentEmployee = () => {
  const { employee, company } = useAuthContext();

  return useQuery({
    queryKey: ['current-employee', employee?.id, company?.id],
    queryFn: async () => {
      if (!employee?.id || !company?.id) return null;

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employee.id)
        .eq('company_id', company.id)
        .single();

      if (error) throw error;
      return data as Employee;
    },
    enabled: !!employee?.id && !!company?.id,
  });
};

// Hook to check if user has access to a specific company
export const useCompanyAccess = (companyId: string) => {
  const { profile, isAdmin } = useAuthContext();

  return useQuery({
    queryKey: ['company-access', companyId, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return false;

      // Admins can potentially access multiple companies
      // Regular users can only access their assigned company
      if (isAdmin) {
        const { data, error } = await supabase
          .from('companies')
          .select('id')
          .eq('id', companyId)
          .single();

        return !error && !!data;
      } else {
        return profile.company_id === companyId;
      }
    },
    enabled: !!profile?.id && !!companyId,
  });
};