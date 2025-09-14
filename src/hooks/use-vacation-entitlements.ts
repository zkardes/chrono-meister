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
          .single()
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'create vacation entitlement');
        throw new Error(errorMessage);
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
      const { data, error } = await withRetry(async () =>
        await supabase
          .from('vacation_entitlements')
          .update(update)
          .eq('id', id)
          .select()
          .single()
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'update vacation entitlement');
        throw new Error(errorMessage);
      }

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
    return entitlements.find(ent => ent.employee_id === employeeId && ent.year === year) || null;
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
    await queryClient.invalidateQueries({ queryKey: ['vacation-entitlements'] });
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