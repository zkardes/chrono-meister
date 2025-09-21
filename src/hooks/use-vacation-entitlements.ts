import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { withRetry, handleDatabaseError } from '@/lib/database-retry';

export type VacationEntitlement = Tables<'vacation_entitlements'>;

interface VacationEntitlementInput {
  employee_id: string;
  year?: number;
  total_days: number;
  carried_over_days?: number;
  bonus_days?: number;
  notes?: string;
}

interface VacationEntitlementUpdate {
  total_days?: number;
  carried_over_days?: number;
  bonus_days?: number;
  notes?: string;
}

interface UseVacationEntitlementsResult {
  entitlements: VacationEntitlement[];
  loading: boolean;
  error: string | null;
  createEntitlement: (entitlement: VacationEntitlementInput) => Promise<void>;
  updateEntitlement: (id: string, update: VacationEntitlementUpdate) => Promise<void>;
  deleteEntitlement: (id: string) => Promise<void>;
  getEmployeeEntitlement: (employeeId: string, year?: number) => VacationEntitlement | null;
  getTotalVacationDays: (employeeId: string, year?: number) => number;
  refreshEntitlements: () => Promise<void>;
}

export const useVacationEntitlements = (): UseVacationEntitlementsResult => {
  const { toast } = useToast();
  const { company, employee, isAdmin } = useAuthContext();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  // Fetch vacation entitlements for the company
  const { data: entitlements = [], isLoading, error: queryError } = useQuery({
    queryKey: ['vacation-entitlements', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await withRetry(async () =>
        await supabase
          .from('vacation_entitlements')
          .select(`
            *,
            employee:employees!vacation_entitlements_employee_id_fkey(*)
          `)
          .order('year', { ascending: false })
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'fetch vacation entitlements');
        throw new Error(errorMessage);
      }

      // Filter by company on the client side as an extra security measure
      return (data as any[])
        .filter(entitlement => entitlement.employee?.company_id === company.id);
    },
    enabled: !!company?.id,
  });

  // Create vacation entitlement mutation
  const createEntitlementMutation = useMutation({
    mutationFn: async (entitlement: VacationEntitlementInput) => {
      const { data, error } = await withRetry(async () =>
        await supabase
          .from('vacation_entitlements')
          .insert({
            employee_id: entitlement.employee_id,
            year: entitlement.year || currentYear,
            total_days: entitlement.total_days,
            carried_over_days: entitlement.carried_over_days || 0,
            bonus_days: entitlement.bonus_days || 0,
            notes: entitlement.notes,
            created_by: employee?.id,
          })
          .select()
          .maybeSingle()
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'create vacation entitlement');
        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error('Urlaubsanspruch konnte nicht erstellt werden. Bitte versuchen Sie es erneut.');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-entitlements'] });
      toast({
        title: "Urlaubsanspruch erstellt",
        description: "Der Urlaubsanspruch wurde erfolgreich erstellt."
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler beim Erstellen",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Update vacation entitlement mutation
  const updateEntitlementMutation = useMutation({
    mutationFn: async ({ id, update }: { id: string; update: VacationEntitlementUpdate }) => {
      console.log('=== Update Entitlement Mutation ===');
      console.log('Attempting to update vacation entitlement:', { id, update });
      
      // Validate that only allowed fields are being updated
      const allowedFields = ['bonus_days', 'notes'];
      const invalidFields = Object.keys(update).filter(key => !allowedFields.includes(key));
      
      if (invalidFields.length > 0) {
        throw new Error(`Ungultige Felder fur Aktualisierung: ${invalidFields.join(', ')}`);
      }
      
      // Log the current user context
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      
      // Check user permissions
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, position')
        .eq('auth_user_id', user?.id)
        .single();
      
      console.log('Employee data:', employeeData);
      console.log('Employee error:', employeeError);

      // First, get the current entitlement to verify it exists and belongs to the user
      console.log('Fetching current entitlement for verification...');
      const { data: currentEntitlement, error: fetchError1 } = await supabase
        .from('vacation_entitlements')
        .select('employee_id')
        .eq('id', id)
        .single();
      
      console.log('Current entitlement:', currentEntitlement);
      console.log('Fetch error:', fetchError1);
      
      if (fetchError1) {
        const errorMessage = handleDatabaseError(fetchError1, 'fetch vacation entitlement');
        throw new Error(errorMessage);
      }
      
      // For regular employees, verify that the entitlement belongs to the current user
      // For admins, allow updating any entitlement
      if (employeeData && employeeData.position !== 'admin') {
        if (currentEntitlement.employee_id !== employeeData.id) {
          throw new Error('Sie haben keine Berechtigung, diesen Urlaubsanspruch zu aktualisieren.');
        }
      }

      // Perform the update directly without retry wrapper for debugging
      console.log('Performing direct update operation...');
      
      // First, let's try to fetch the record to make sure it exists
      const { data: existingData, error: fetchError2 } = await supabase
        .from('vacation_entitlements')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      console.log('Existing data before update:', existingData);
      console.log('Fetch error:', fetchError2);
      
      if (fetchError2) {
        const errorMessage = handleDatabaseError(fetchError2, 'fetch vacation entitlement');
        throw new Error(errorMessage);
      }
      
      if (!existingData) {
        throw new Error('Urlaubsanspruch nicht gefunden.');
      }
      
      // Now perform the update
      const { data, error } = await supabase
        .from('vacation_entitlements')
        .update(update)
        .eq('id', id)
        .select()
        .maybeSingle();

      console.log('Direct update result data:', data);
      console.log('Direct update error:', error);

      if (error) {
        const errorMessage = handleDatabaseError(error, 'update vacation entitlement');
        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error('Urlaubsanspruch konnte nicht aktualisiert werden. Bitte versuchen Sie es erneut.');
      }

      console.log('=== Update Entitlement Mutation Completed ===');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-entitlements'] });
      toast({
        title: "Urlaubsanspruch aktualisiert",
        description: "Der Urlaubsanspruch wurde erfolgreich aktualisiert."
      });
    },
    onError: (error) => {
      console.error('=== Update Entitlement Mutation Error ===');
      console.error('Update entitlement mutation error:', error);
      toast({
        title: "Fehler beim Aktualisieren",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Delete vacation entitlement mutation
  const deleteEntitlementMutation = useMutation({
    mutationFn: async (id: string) => {
      // First, check if the entitlement exists
      const { data: existingData, error: fetchError } = await withRetry(async () =>
        await supabase
          .from('vacation_entitlements')
          .select()
          .eq('id', id)
          .maybeSingle()
      );

      if (fetchError) {
        const errorMessage = handleDatabaseError(fetchError, 'fetch vacation entitlement');
        throw new Error(errorMessage);
      }

      if (!existingData) {
        throw new Error('Urlaubsanspruch nicht gefunden. Die ID existiert möglicherweise nicht.');
      }

      // Now perform the delete
      const { error } = await withRetry(async () =>
        await supabase
          .from('vacation_entitlements')
          .delete()
          .eq('id', id)
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'delete vacation entitlement');
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-entitlements'] });
      toast({
        title: "Urlaubsanspruch gelöscht",
        description: "Der Urlaubsanspruch wurde erfolgreich gelöscht."
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler beim Löschen",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Get specific employee entitlement for a year
  const getEmployeeEntitlement = (employeeId: string, year: number = currentYear): VacationEntitlement | null => {
    console.log('Getting employee entitlement:', { employeeId, year, entitlements });
    const result = entitlements.find(ent => ent.employee_id === employeeId && ent.year === year) || null;
    console.log('Found entitlement:', result);
    return result;
  };

  // Get total vacation days for an employee (including carried over and bonus days)
  const getTotalVacationDays = (employeeId: string, year: number = currentYear): number => {
    const entitlement = getEmployeeEntitlement(employeeId, year);
    if (!entitlement) {
      // Fallback to default entitlements based on position if no entitlement found
      const DEFAULT_ENTITLEMENTS: Record<string, number> = {
        'admin': 35,
        'manager': 32,
        'employee': 30,
        'trainee': 24,
      };
      
      // Try to find employee position from vacation entitlements data
      const employeeData = entitlements.find(e => e.employee_id === employeeId);
      const role = (employeeData as any)?.employee?.position?.toLowerCase() || 'employee';
      
      if (role.includes('admin') || role.includes('leitung')) {
        return DEFAULT_ENTITLEMENTS['admin'];
      } else if (role.includes('manager') || role.includes('führung')) {
        return DEFAULT_ENTITLEMENTS['manager'];
      } else if (role.includes('fsj') || role.includes('azubi') || role.includes('praktikant')) {
        return DEFAULT_ENTITLEMENTS['trainee'];
      }
      return DEFAULT_ENTITLEMENTS['employee'];
    }
    
    return entitlement.total_days + entitlement.carried_over_days + entitlement.bonus_days;
  };

  // Refresh entitlements
  const refreshEntitlements = async () => {
    console.log('Refreshing entitlements...');
    await queryClient.invalidateQueries({ queryKey: ['vacation-entitlements'] });
    console.log('Entitlements refresh completed');
  };

  return {
    entitlements,
    loading: isLoading,
    error: queryError?.message || null,
    createEntitlement: async (entitlement: VacationEntitlementInput) => {
      await createEntitlementMutation.mutateAsync(entitlement);
    },
    updateEntitlement: async (id: string, update: VacationEntitlementUpdate) => {
      await updateEntitlementMutation.mutateAsync({ id, update });
    },
    deleteEntitlement: async (id: string) => {
      await deleteEntitlementMutation.mutateAsync(id);
    },
    getEmployeeEntitlement,
    getTotalVacationDays,
    refreshEntitlements,
  };
};