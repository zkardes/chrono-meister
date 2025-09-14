import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { withRetry, handleDatabaseError } from '@/lib/database-retry';
import { useVacationEntitlements } from './use-vacation-entitlements';

export type VacationRequest = Tables<'vacation_requests'>;
export type Employee = Tables<'employees'>;

interface VacationRequestWithEmployee extends VacationRequest {
  employee: Employee | null;
}

interface VacationRequestInput {
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  request_type?: string;
}

interface VacationApprovalInput {
  status: 'approved' | 'rejected';
  admin_note?: string;
}

interface VacationStats {
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  availableDays: number;
}

interface UseVacationResult {
  vacationRequests: VacationRequestWithEmployee[];
  loading: boolean;
  error: string | null;
  submitRequest: (request: VacationRequestInput) => Promise<void>;
  approveRequest: (requestId: string, approval: VacationApprovalInput) => Promise<void>;
  deleteRequest: (requestId: string) => Promise<void>;
  refreshRequests: () => Promise<void>;
  getVacationStats: (employeeId: string) => VacationStats;
  isEmployeeOnVacation: (employeeId: string, date: string) => boolean;
  getEmployeeVacationDays: (employeeId: string) => Date[];
}

export const useVacation = (): UseVacationResult => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { company, employee, isAdmin } = useAuthContext();
  const queryClient = useQueryClient();
  const { getTotalVacationDays } = useVacationEntitlements();

  // Fetch vacation requests for the company
  const { data: vacationRequests = [], isLoading, error: queryError } = useQuery({
    queryKey: ['vacation-requests', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await withRetry(async () =>
        await supabase
          .from('vacation_requests')
          .select(`
            *,
            employee:employees!vacation_requests_employee_id_fkey(*)
          `)
          .order('created_at', { ascending: false })
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'fetch vacation requests');
        throw new Error(errorMessage);
      }

      // Filter by company on the client side as an extra security measure
      return (data as VacationRequestWithEmployee[])
        .filter(request => request.employee?.company_id === company.id);
    },
    enabled: !!company?.id,
  });

  useEffect(() => {
    setLoading(isLoading);
    setError(queryError?.message || null);
  }, [isLoading, queryError]);

  // Submit vacation request mutation
  const submitRequestMutation = useMutation({
    mutationFn: async (request: VacationRequestInput) => {
      if (!employee?.id) {
        throw new Error('Employee not found');
      }

      const { data, error } = await withRetry(async () =>
        await supabase
          .from('vacation_requests')
          .insert({
            employee_id: employee.id,
            start_date: request.start_date,
            end_date: request.end_date,
            days_requested: request.days_requested,
            reason: request.reason,
            request_type: request.request_type || 'vacation',
            status: 'pending',
          })
          .select(`
            *,
            employee:employees!vacation_requests_employee_id_fkey(*)
          `)
          .single()
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'submit vacation request');
        throw new Error(errorMessage);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-requests'] });
      toast({
        title: "Urlaubsantrag eingereicht",
        description: "Ihr Urlaubsantrag wurde erfolgreich eingereicht und wartet auf Genehmigung."
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler beim Einreichen",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Approve/reject vacation request mutation (admin only)
  const approveRequestMutation = useMutation({
    mutationFn: async ({ requestId, approval }: { requestId: string; approval: VacationApprovalInput }) => {
      if (!isAdmin || !employee?.id) {
        throw new Error('Unauthorized to approve requests');
      }

      const updateData: any = {
        status: approval.status,
        approved_by: employee.id,
        approved_at: new Date().toISOString(),
      };

      // Note: The database schema doesn't include admin_note, but we can add it to reason for tracking
      if (approval.admin_note) {
        const currentRequest = vacationRequests.find(r => r.id === requestId);
        if (currentRequest) {
          updateData.reason = `${currentRequest.reason}\n\n[Admin-Notiz: ${approval.admin_note}]`;
        }
      }

      const { data, error } = await withRetry(async () =>
        await supabase
          .from('vacation_requests')
          .update(updateData)
          .eq('id', requestId)
          .select(`
            *,
            employee:employees!vacation_requests_employee_id_fkey(*)
          `)
          .single()
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'approve vacation request');
        throw new Error(errorMessage);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vacation-requests'] });
      const action = data.status === 'approved' ? 'genehmigt' : 'abgelehnt';
      toast({
        title: `Antrag ${action}`,
        description: `Der Urlaubsantrag wurde ${action}.`
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler beim Bearbeiten",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Delete vacation request mutation
  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await withRetry(async () =>
        await supabase
          .from('vacation_requests')
          .delete()
          .eq('id', requestId)
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'delete vacation request');
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-requests'] });
      toast({
        title: "Urlaubsantrag storniert",
        description: "Der Urlaubsantrag wurde erfolgreich storniert."
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler beim Stornieren",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Calculate vacation statistics for an employee
  const getVacationStats = (employeeId: string): VacationStats => {
    // Get total vacation days from entitlements system
    const totalDays = getTotalVacationDays(employeeId);
    
    const employeeRequests = vacationRequests.filter(req => req.employee_id === employeeId);
    
    const usedDays = employeeRequests
      .filter(req => req.status === 'approved')
      .reduce((sum, req) => sum + req.days_requested, 0);
    
    const pendingDays = employeeRequests
      .filter(req => req.status === 'pending')
      .reduce((sum, req) => sum + req.days_requested, 0);
    
    const remainingDays = totalDays - usedDays;
    const availableDays = remainingDays - pendingDays;
    
    return {
      totalDays,
      usedDays,
      pendingDays,
      remainingDays,
      availableDays: Math.max(0, availableDays)
    };
  };

  // Check if employee is on vacation on a specific date
  const isEmployeeOnVacation = (employeeId: string, date: string): boolean => {
    const checkDate = new Date(date);
    
    return vacationRequests.some(request => {
      if (request.employee_id !== employeeId || request.status !== 'approved') {
        return false;
      }
      
      const startDate = new Date(request.start_date);
      const endDate = new Date(request.end_date);
      
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  // Get all vacation days for an employee
  const getEmployeeVacationDays = (employeeId: string): Date[] => {
    const vacationDays: Date[] = [];
    const approvedRequests = vacationRequests.filter(
      req => req.employee_id === employeeId && req.status === 'approved'
    );
    
    approvedRequests.forEach(request => {
      const start = new Date(request.start_date);
      const end = new Date(request.end_date);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        vacationDays.push(new Date(d));
      }
    });
    
    return vacationDays;
  };

  // Refresh vacation requests
  const refreshRequests = async () => {
    await queryClient.invalidateQueries({ queryKey: ['vacation-requests'] });
  };

  return {
    vacationRequests,
    loading,
    error,
    submitRequest: async (request: VacationRequestInput) => {
      await submitRequestMutation.mutateAsync(request);
    },
    approveRequest: async (requestId: string, approval: VacationApprovalInput) => {
      await approveRequestMutation.mutateAsync({ requestId, approval });
    },
    deleteRequest: async (requestId: string) => {
      await deleteRequestMutation.mutateAsync(requestId);
    },
    refreshRequests,
    getVacationStats,
    isEmployeeOnVacation,
    getEmployeeVacationDays,
  };
};

// Hook specifically for vacation constraints in scheduling
export const useVacationConstraints = () => {
  const { isEmployeeOnVacation, getEmployeeVacationDays } = useVacation();

  return {
    isEmployeeOnVacation,
    getEmployeeVacationDays,
    // Check if employee can be assigned to a shift on a specific date
    canAssignEmployee: (employeeId: string, date: string): boolean => {
      return !isEmployeeOnVacation(employeeId, date);
    },
    // Get vacation status message for scheduling UI
    getVacationStatusMessage: (employeeId: string, date: string): string | null => {
      if (isEmployeeOnVacation(employeeId, date)) {
        return 'Mitarbeiter ist im Urlaub';
      }
      return null;
    },
  };
};