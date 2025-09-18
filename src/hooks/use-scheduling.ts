import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { withRetry, handleDatabaseError } from '@/lib/database-retry';

// Updated with explicit foreign key relationships to fix PGRST201 error

export type TimeSlot = Tables<'time_slots'>;
export type ScheduleAssignment = Tables<'schedule_assignments'>;
export type Employee = Tables<'employees'>;
export type Group = Tables<'groups'>;

interface UseTimeSlotsResult {
  timeSlots: TimeSlot[];
  loading: boolean;
  error: string | null;
  createTimeSlot: (timeSlot: Omit<TimeSlot, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'created_by'>) => Promise<void>;
  updateTimeSlot: (id: string, updates: Partial<TimeSlot>) => Promise<void>;
  deleteTimeSlot: (id: string) => Promise<void>;
  refreshTimeSlots: () => Promise<void>;
}

interface UseScheduleAssignmentsResult {
  scheduleAssignments: ScheduleAssignment[];
  loading: boolean;
  error: string | null;
  assignEmployee: (employeeId: string, timeSlotId: string, scheduledDate: string, notes?: string) => Promise<void>;
  unassignEmployee: (employeeId: string, timeSlotId: string, scheduledDate: string) => Promise<void>;
  updateAssignment: (id: string, updates: Partial<ScheduleAssignment>) => Promise<void>;
  getAssignmentsForDate: (date: string) => ScheduleAssignment[];
  getAssignmentsForSlot: (timeSlotId: string, date: string) => ScheduleAssignment[];
  refreshAssignments: () => Promise<void>;
}

interface UseEmployeesResult {
  employees: Employee[];
  loading: boolean;
  error: string | null;
  getEmployeesByGroup: (groupId?: string) => Employee[];
  refreshEmployees: () => Promise<void>;
}

// Hook for managing time slots
export const useTimeSlots = (): UseTimeSlotsResult => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { company, employee } = useAuthContext();
  const { toast } = useToast();

  const refreshTimeSlots = async () => {
    if (!company) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await withRetry(async () =>
        await supabase
          .from('time_slots')
          .select('*')
          .eq('company_id', company.id)
          .eq('is_active', true)
          .order('start_time')
      );

      if (fetchError) {
        const errorMessage = handleDatabaseError(fetchError, 'fetch time slots');
        throw new Error(errorMessage);
      }

      setTimeSlots(data as TimeSlot[] || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch time slots';
      setError(errorMessage);
      console.error('Error fetching time slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTimeSlot = async (timeSlot: Omit<TimeSlot, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    if (!company || !employee) {
      throw new Error('Company and employee required');
    }

    try {
      const { data, error: insertError } = await withRetry(async () =>
        await supabase
          .from('time_slots')
          .insert({
            ...timeSlot,
            company_id: company.id,
            created_by: employee.id,
          })
          .select()
          .single()
      );

      if (insertError) {
        const errorMessage = handleDatabaseError(insertError, 'create time slot');
        throw new Error(errorMessage);
      }

      setTimeSlots(prev => [...prev, data as TimeSlot]);
      toast({
        title: "Zeitslot erstellt",
        description: `${timeSlot.name} wurde erfolgreich erstellt.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create time slot';
      setError(errorMessage);
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateTimeSlot = async (id: string, updates: Partial<TimeSlot>) => {
    try {
      const { data, error: updateError } = await withRetry(async () =>
        await supabase
          .from('time_slots')
          .update(updates)
          .eq('id', id)
          .select()
          .single()
      );

      if (updateError) {
        const errorMessage = handleDatabaseError(updateError, 'update time slot');
        throw new Error(errorMessage);
      }

      setTimeSlots(prev => prev.map(slot => slot.id === id ? data as TimeSlot : slot));
      toast({
        title: "Zeitslot aktualisiert",
        description: "Der Zeitslot wurde erfolgreich aktualisiert.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update time slot';
      setError(errorMessage);
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteTimeSlot = async (id: string) => {
    try {
      const { error: deleteError } = await withRetry(async () =>
        await supabase
          .from('time_slots')
          .delete()
          .eq('id', id)
      );

      if (deleteError) {
        const errorMessage = handleDatabaseError(deleteError, 'delete time slot');
        throw new Error(errorMessage);
      }

      setTimeSlots(prev => prev.filter(slot => slot.id !== id));
      toast({
        title: "Zeitslot gelöscht",
        description: "Der Zeitslot wurde erfolgreich entfernt.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete time slot';
      setError(errorMessage);
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    refreshTimeSlots();
  }, [company]);

  return {
    timeSlots,
    loading,
    error,
    createTimeSlot,
    updateTimeSlot,
    deleteTimeSlot,
    refreshTimeSlots,
  };
};

// Hook for managing schedule assignments
export const useScheduleAssignments = (startDate?: string, endDate?: string): UseScheduleAssignmentsResult => {
  const [scheduleAssignments, setScheduleAssignments] = useState<ScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { company, employee } = useAuthContext();
  const { toast } = useToast();

  const refreshAssignments = async () => {
    if (!company) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await withRetry(async () => {
        let query = supabase
          .from('schedule_assignments')
          .select(`
            *,
            employee:employees!schedule_assignments_employee_id_fkey(id, first_name, last_name, employee_id, employee_groups(group:groups(id, name))),
            time_slot:time_slots!schedule_assignments_time_slot_id_fkey(id, name, start_time, end_time, color)
          `)
          .eq('company_id', company.id);

        if (startDate) {
          query = query.gte('scheduled_date', startDate);
        }
        if (endDate) {
          query = query.lte('scheduled_date', endDate);
        }

        return query.order('scheduled_date');
      });

      if (fetchError) {
        const errorMessage = handleDatabaseError(fetchError, 'fetch schedule assignments');
        throw new Error(errorMessage);
      }

      setScheduleAssignments(data as ScheduleAssignment[] || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch schedule assignments';
      setError(errorMessage);
      console.error('Error fetching schedule assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const assignEmployee = async (employeeId: string, timeSlotId: string, scheduledDate: string, notes?: string) => {
    if (!company || !employee) {
      throw new Error('Company and employee required');
    }

    console.log('🔄 assignEmployee called with:', { employeeId, timeSlotId, scheduledDate, notes });

    try {
      const { data, error: insertError } = await withRetry(async () => {
        console.log('🔍 Executing insert operation with explicit relationships');
        return await supabase
          .from('schedule_assignments')
          .insert({
            company_id: company.id,
            employee_id: employeeId,
            time_slot_id: timeSlotId,
            scheduled_date: scheduledDate,
            notes: notes || null,
            created_by: employee.id,
            status: 'scheduled',
          })
          .select(`
            *,
            employee:employees!schedule_assignments_employee_id_fkey(id, first_name, last_name, employee_id, employee_groups(group:groups(id, name))),
            time_slot:time_slots!schedule_assignments_time_slot_id_fkey(id, name, start_time, end_time, color)
          `)
          .single();
      });

      if (insertError) {
        const errorMessage = handleDatabaseError(insertError, 'assign employee');
        throw new Error(errorMessage);
      }

      setScheduleAssignments(prev => [...prev, data as ScheduleAssignment]);
      toast({
        title: "Mitarbeiter zugewiesen",
        description: "Der Mitarbeiter wurde erfolgreich der Schicht zugewiesen.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign employee';
      if (errorMessage.includes('duplicate key') || errorMessage.includes('already exists')) {
        toast({
          title: "Mitarbeiter bereits zugewiesen",
          description: "Dieser Mitarbeiter ist bereits für diese Schicht eingeteilt.",
          variant: "destructive",
        });
      } else {
        setError(errorMessage);
        toast({
          title: "Fehler",
          description: errorMessage,
          variant: "destructive",
        });
      }
      throw err;
    }
  };

  const unassignEmployee = async (employeeId: string, timeSlotId: string, scheduledDate: string) => {
    try {
      const { error: deleteError } = await withRetry(async () => 
        await supabase
          .from('schedule_assignments')
          .delete()
          .eq('employee_id', employeeId)
          .eq('time_slot_id', timeSlotId)
          .eq('scheduled_date', scheduledDate)
      );

      if (deleteError) {
        const errorMessage = handleDatabaseError(deleteError, 'unassign employee');
        throw new Error(errorMessage);
      }

      setScheduleAssignments(prev => 
        prev.filter(assignment => 
          !(assignment.employee_id === employeeId && 
            assignment.time_slot_id === timeSlotId && 
            assignment.scheduled_date === scheduledDate)
        )
      );

      toast({
        title: "Mitarbeiter entfernt",
        description: "Der Mitarbeiter wurde von der Schicht entfernt.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unassign employee';
      setError(errorMessage);
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateAssignment = async (id: string, updates: Partial<ScheduleAssignment>) => {
    try {
      const { data, error: updateError } = await withRetry(async () =>
        await supabase
          .from('schedule_assignments')
          .update(updates)
          .eq('id', id)
          .select(`
            *,
            employee:employees!schedule_assignments_employee_id_fkey(id, first_name, last_name, employee_id, employee_groups(group:groups(id, name))),
            time_slot:time_slots!schedule_assignments_time_slot_id_fkey(id, name, start_time, end_time, color)
          `)
          .single()
      );

      if (updateError) {
        const errorMessage = handleDatabaseError(updateError, 'update assignment');
        throw new Error(errorMessage);
      }

      setScheduleAssignments(prev => prev.map(assignment => assignment.id === id ? data as ScheduleAssignment : assignment));
      toast({
        title: "Zuweisung aktualisiert",
        description: "Die Schichtzuweisung wurde erfolgreich aktualisiert.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update assignment';
      setError(errorMessage);
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const getAssignmentsForDate = (date: string): ScheduleAssignment[] => {
    return scheduleAssignments.filter(assignment => assignment.scheduled_date === date);
  };

  const getAssignmentsForSlot = (timeSlotId: string, date: string): ScheduleAssignment[] => {
    return scheduleAssignments.filter(
      assignment => assignment.time_slot_id === timeSlotId && assignment.scheduled_date === date
    );
  };

  useEffect(() => {
    refreshAssignments();
  }, [company, startDate, endDate]);

  return {
    scheduleAssignments,
    loading,
    error,
    assignEmployee,
    unassignEmployee,
    updateAssignment,
    getAssignmentsForDate,
    getAssignmentsForSlot,
    refreshAssignments,
  };
};

// Hook for managing employees with group filtering
export const useEmployees = (): UseEmployeesResult => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { company } = useAuthContext();

  const refreshEmployees = async () => {
    if (!company) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await withRetry(async () =>
        await supabase
          .from('employees')
          .select(`
            *,
            employee_groups(
              group:groups(id, name)
            )
          `)
          .eq('company_id', company.id)
          .eq('is_active', true)
          .order('first_name')
      );

      if (fetchError) {
        const errorMessage = handleDatabaseError(fetchError, 'fetch employees');
        throw new Error(errorMessage);
      }

      setEmployees(data as Employee[] || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch employees';
      setError(errorMessage);
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeesByGroup = (groupId?: string): Employee[] => {
    if (!groupId || groupId === 'all') {
      return employees;
    }

    return employees.filter(employee => {
      const empWithGroups = employee as any; // Type assertion for employee_groups
      return empWithGroups.employee_groups?.some((eg: any) => eg.group?.id === groupId);
    });
  };

  useEffect(() => {
    refreshEmployees();
  }, [company]);

  return {
    employees,
    loading,
    error,
    getEmployeesByGroup,
    refreshEmployees,
  };
};