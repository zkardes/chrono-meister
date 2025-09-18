import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Tables, Database } from '@/integrations/supabase/types';
import { withRetry, handleDatabaseError } from '@/lib/database-retry';

type Employee = Tables<'employees'>;
type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
type EmployeeUpdate = Database['public']['Tables']['employees']['Update'];

export interface CreateEmployeeData {
  first_name: string;
  last_name: string;
  email: string;
  position?: string;
  department?: string;
  hire_date?: string;
  hourly_rate?: number;
  employee_id?: string;
}

export interface UpdateEmployeeData extends EmployeeUpdate {
  id: string;
}

// Hook for creating new employees
export const useCreateEmployee = () => {
  const { company, isAdmin, isManager } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeData: CreateEmployeeData) => {
      if (!company?.id) {
        throw new Error('No company context available');
      }

      if (!isAdmin && !isManager) {
        throw new Error('Insufficient permissions to create employees');
      }

      // Check if employee with same email already exists in company
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('id, email')
        .eq('company_id', company.id)
        .eq('email', employeeData.email)
        .eq('is_active', true)
        .single();

      if (existingEmployee) {
        throw new Error('An employee with this email already exists in your company');
      }

      const newEmployee: EmployeeInsert = {
        ...employeeData,
        company_id: company.id,
        is_active: true,
      };

      const { data, error } = await withRetry(async () =>
        await supabase
          .from('employees')
          .insert(newEmployee)
          .select('*')
          .single()
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'create employee');
        throw new Error(errorMessage);
      }

      return data as Employee;
    },
    onSuccess: () => {
      // Invalidate and refetch company employees
      queryClient.invalidateQueries({ queryKey: ['company-employees', company?.id] });
    },
  });
};

// Hook for updating employee data
export const useUpdateEmployee = () => {
  const { company, isAdmin, isManager } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeData: UpdateEmployeeData) => {
      if (!company?.id) {
        throw new Error('No company context available');
      }

      if (!isAdmin && !isManager) {
        throw new Error('Insufficient permissions to update employees');
      }

      const { id, ...updateData } = employeeData;

      const { data, error } = await withRetry(async () =>
        await supabase
          .from('employees')
          .update(updateData)
          .eq('id', id)
          .eq('company_id', company.id) // Ensure company isolation
          .select('*')
          .single()
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'update employee');
        throw new Error(errorMessage);
      }

      return data as Employee;
    },
    onSuccess: () => {
      // Invalidate and refetch company employees
      queryClient.invalidateQueries({ queryKey: ['company-employees', company?.id] });
    },
  });
};

// Hook for deactivating employees (soft delete)
export const useDeactivateEmployee = () => {
  const { company, isAdmin, isManager } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      if (!company?.id) {
        throw new Error('No company context available');
      }

      if (!isAdmin && !isManager) {
        throw new Error('Insufficient permissions to deactivate employees');
      }

      const { data, error } = await withRetry(async () =>
        await supabase
          .from('employees')
          .update({ is_active: false })
          .eq('id', employeeId)
          .eq('company_id', company.id) // Ensure company isolation
          .select('*')
          .single()
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'deactivate employee');
        throw new Error(errorMessage);
      }

      return data as Employee;
    },
    onSuccess: () => {
      // Invalidate and refetch company employees
      queryClient.invalidateQueries({ queryKey: ['company-employees', company?.id] });
    },
  });
};

// Hook for reactivating employees
export const useReactivateEmployee = () => {
  const { company, isAdmin, isManager } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      if (!company?.id) {
        throw new Error('No company context available');
      }

      if (!isAdmin && !isManager) {
        throw new Error('Insufficient permissions to reactivate employees');
      }

      const { data, error } = await withRetry(async () =>
        await supabase
          .from('employees')
          .update({ is_active: true })
          .eq('id', employeeId)
          .eq('company_id', company.id) // Ensure company isolation
          .select('*')
          .single()
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'reactivate employee');
        throw new Error(errorMessage);
      }

      return data as Employee;
    },
    onSuccess: () => {
      // Invalidate and refetch company employees
      queryClient.invalidateQueries({ queryKey: ['company-employees', company?.id] });
    },
  });
};

// Hook to find and link employee during registration
export const useFindEmployeeForLinking = () => {
  const { company } = useAuthContext();

  return useMutation({
    mutationFn: async (userData: {
      firstName: string;
      lastName: string;
      email: string;
    }) => {
      if (!company?.id) {
        throw new Error('No company context available');
      }

      // Try to find employee by exact match first
      let { data: employee, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', company.id)
        .eq('email', userData.email.toLowerCase())
        .eq('first_name', userData.firstName)
        .eq('last_name', userData.lastName)
        .eq('is_active', true)
        .is('auth_user_id', null) // Not already linked
        .single();

      // If no exact match, try email only
      if (!employee && !error) {
        const { data: emailMatch, error: emailError } = await supabase
          .from('employees')
          .select('*')
          .eq('company_id', company.id)
          .eq('email', userData.email.toLowerCase())
          .eq('is_active', true)
          .is('auth_user_id', null) // Not already linked
          .single();

        if (!emailError && emailMatch) {
          employee = emailMatch;
        }
      }

      if (!employee) {
        throw new Error('No matching employee record found for linking');
      }

      return employee as Employee;
    },
  });
};

// Export employee management hooks
export const useEmployeeManagement = () => {
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deactivateEmployee = useDeactivateEmployee();
  const reactivateEmployee = useReactivateEmployee();
  const findEmployeeForLinking = useFindEmployeeForLinking();

  return {
    createEmployee,
    updateEmployee,
    deactivateEmployee,
    reactivateEmployee,
    findEmployeeForLinking,
  };
};