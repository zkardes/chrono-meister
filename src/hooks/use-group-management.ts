import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Tables, Database } from '@/integrations/supabase/types';
import { withRetry, handleDatabaseError } from '@/lib/database-retry';
import { getFullEmployeeName } from '@/lib/employee-utils';

type Group = Tables<'groups'>;
type Employee = Tables<'employees'>;
type EmployeeGroup = Tables<'employee_groups'>;
type GroupInsert = Database['public']['Tables']['groups']['Insert'];
type GroupUpdate = Database['public']['Tables']['groups']['Update'];
type EmployeeGroupInsert = Database['public']['Tables']['employee_groups']['Insert'];

export interface CreateGroupData {
  name: string;
  description?: string;
  manager_id?: string;
}

export interface UpdateGroupData extends GroupUpdate {
  id: string;
}

export interface GroupWithDetails extends Group {
  manager: Pick<Employee, 'first_name' | 'last_name'> | null;
  member_count: number;
  members: Array<{
    id: string;
    employee: Pick<Employee, 'id' | 'first_name' | 'last_name' | 'position' | 'department'>;
    created_at: string | null;
  }>;
}

// Hook for creating new groups
export const useCreateGroup = () => {
  const { company, isAdmin, isManager } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupData: CreateGroupData) => {
      console.log('=== useCreateGroup START ===');
      console.log('Starting group creation process');
      
      if (!company?.id) {
        console.error('No company context available');
        throw new Error('No company context available');
      }

      if (!isAdmin && !isManager) {
        console.error('Insufficient permissions to create groups');
        throw new Error('Insufficient permissions to create groups');
      }

      console.log('Creating group with data:', groupData);
      console.log('Company ID:', company.id);
      console.log('User role - isAdmin:', isAdmin, 'isManager:', isManager);

      // Check if group with same name already exists in company
      console.log('Checking for existing groups with name:', groupData.name);
      const { data: existingGroups, error: existingGroupError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('company_id', company.id)
        .eq('name', groupData.name);

      if (existingGroupError) {
        console.error('Error checking for existing group:', existingGroupError);
        // Continue with group creation even if check fails
      } else if (existingGroups && existingGroups.length > 0) {
        console.error('Group with this name already exists in your company');
        throw new Error('A group with this name already exists in your company');
      }

      const newGroup: GroupInsert = {
        ...groupData,
        company_id: company.id,
      };

      console.log('Inserting new group:', newGroup);

      // Validate that all required fields are present
      if (!newGroup.name) {
        console.error('Group name is required');
        throw new Error('Group name is required');
      }

      const { data, error } = await withRetry(async () => {
        console.log('Executing group insert operation');
        const result = await supabase
          .from('groups')
          .insert(newGroup)
          .select('*')
          .single();
        console.log('Group insert operation result:', result);
        return result;
      });

      if (error) {
        console.error('=== DATABASE ERROR ===');
        console.error('Error creating group:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        const errorMessage = handleDatabaseError(error, 'create group');
        throw new Error(errorMessage);
      }

      console.log('Group created successfully:', data);
      return data as Group;
    },
    onSuccess: () => {
      // Invalidate and refetch company groups
      queryClient.invalidateQueries({ queryKey: ['company-groups', company?.id] });
      queryClient.invalidateQueries({ queryKey: ['groups-with-details', company?.id] });
    },
    onError: (error) => {
      console.error('=== useCreateGroup ERROR ===');
      console.error('Mutation error:', error);
    }
  });
};

// Hook for updating group data
export const useUpdateGroup = () => {
  const { company, isAdmin, isManager } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupData: UpdateGroupData) => {
      if (!company?.id) {
        throw new Error('No company context available');
      }

      if (!isAdmin && !isManager) {
        throw new Error('Insufficient permissions to update groups');
      }

      const { id, ...updateData } = groupData;

      const { data, error } = await withRetry(async () =>
        await supabase
          .from('groups')
          .update(updateData)
          .eq('id', id)
          .eq('company_id', company.id) // Ensure company isolation
          .select('*')
          .single()
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'update group');
        throw new Error(errorMessage);
      }

      return data as Group;
    },
    onSuccess: () => {
      // Invalidate and refetch company groups
      queryClient.invalidateQueries({ queryKey: ['company-groups', company?.id] });
      queryClient.invalidateQueries({ queryKey: ['groups-with-details', company?.id] });
    },
  });
};

// Hook for deleting groups
export const useDeleteGroup = () => {
  const { company, isAdmin, isManager } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!company?.id) {
        throw new Error('No company context available');
      }

      if (!isAdmin && !isManager) {
        throw new Error('Insufficient permissions to delete groups');
      }

      // First remove all employee assignments
      const { error: employeeGroupError } = await withRetry(async () =>
        await supabase
          .from('employee_groups')
          .delete()
          .eq('group_id', groupId)
      );

      if (employeeGroupError) {
        const errorMessage = handleDatabaseError(employeeGroupError, 'remove group members');
        throw new Error(errorMessage);
      }

      // Then delete the group
      const { data, error } = await withRetry(async () =>
        await supabase
          .from('groups')
          .delete()
          .eq('id', groupId)
          .eq('company_id', company.id) // Ensure company isolation
          .select('*')
          .single()
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'delete group');
        throw new Error(errorMessage);
      }

      return data as Group;
    },
    onSuccess: () => {
      // Invalidate and refetch company groups
      queryClient.invalidateQueries({ queryKey: ['company-groups', company?.id] });
      queryClient.invalidateQueries({ queryKey: ['groups-with-details', company?.id] });
    },
  });
};

// Hook for adding employees to groups
export const useAddEmployeesToGroup = () => {
  const { company, isAdmin, isManager } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, employeeIds }: { groupId: string; employeeIds: string[] }) => {
      if (!company?.id) {
        throw new Error('No company context available');
      }

      if (!isAdmin && !isManager) {
        throw new Error('Insufficient permissions to manage group members');
      }

      // Validate that all employees belong to the same company
      const { data: employees, error: employeeError } = await supabase
        .from('employees')
        .select('id, company_id')
        .in('id', employeeIds)
        .eq('company_id', company.id);

      if (employeeError) {
        const errorMessage = handleDatabaseError(employeeError, 'validate employees');
        throw new Error(errorMessage);
      }

      if (employees.length !== employeeIds.length) {
        throw new Error('Some employees do not exist or do not belong to your company');
      }

      // Check for existing assignments
      const { data: existingAssignments } = await supabase
        .from('employee_groups')
        .select('employee_id')
        .eq('group_id', groupId)
        .in('employee_id', employeeIds);

      const existingEmployeeIds = existingAssignments?.map(a => a.employee_id) || [];
      const newEmployeeIds = employeeIds.filter(id => !existingEmployeeIds.includes(id));

      if (newEmployeeIds.length === 0) {
        throw new Error('All selected employees are already members of this group');
      }

      // Create new assignments
      const assignments: EmployeeGroupInsert[] = newEmployeeIds.map(employeeId => ({
        group_id: groupId,
        employee_id: employeeId,
      }));

      const { data, error } = await withRetry(async () =>
        await supabase
          .from('employee_groups')
          .insert(assignments)
          .select('*')
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'add employees to group');
        throw new Error(errorMessage);
      }

      return data as EmployeeGroup[];
    },
    onSuccess: () => {
      // Invalidate and refetch groups data
      queryClient.invalidateQueries({ queryKey: ['company-groups', company?.id] });
      queryClient.invalidateQueries({ queryKey: ['groups-with-details', company?.id] });
    },
  });
};

// Hook for removing employees from groups
export const useRemoveEmployeeFromGroup = () => {
  const { company, isAdmin, isManager } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, employeeId }: { groupId: string; employeeId: string }) => {
      if (!company?.id) {
        throw new Error('No company context available');
      }

      if (!isAdmin && !isManager) {
        throw new Error('Insufficient permissions to manage group members');
      }

      const { data, error } = await withRetry(async () =>
        await supabase
          .from('employee_groups')
          .delete()
          .eq('group_id', groupId)
          .eq('employee_id', employeeId)
          .select('*')
          .single()
      );

      if (error) {
        const errorMessage = handleDatabaseError(error, 'remove employee from group');
        throw new Error(errorMessage);
      }

      return data as EmployeeGroup;
    },
    onSuccess: () => {
      // Invalidate and refetch groups data
      queryClient.invalidateQueries({ queryKey: ['company-groups', company?.id] });
      queryClient.invalidateQueries({ queryKey: ['groups-with-details', company?.id] });
    },
  });
};

// Hook to get groups with detailed information including members
export const useGroupsWithDetails = () => {
  const { company } = useAuthContext();

  return useQuery({
    queryKey: ['groups-with-details', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      // Get groups with manager info
      const { data: groups, error: groupsError } = await withRetry(async () =>
        await supabase
          .from('groups')
          .select(`
            *,
            manager:employees!groups_manager_id_fkey(first_name, last_name)
          `)
          .eq('company_id', company.id)
          .order('name')
      );

      if (groupsError) {
        const errorMessage = handleDatabaseError(groupsError, 'fetch groups');
        throw new Error(errorMessage);
      }

      // Get group members
      const groupIds = groups.map(g => g.id);
      
      if (groupIds.length === 0) {
        return [];
      }

      const { data: memberData, error: memberError } = await withRetry(async () =>
        await supabase
          .from('employee_groups')
          .select(`
            *,
            employee:employees!employee_groups_employee_id_fkey(
              id, first_name, last_name, position, department
            )
          `)
          .in('group_id', groupIds)
          .order('created_at', { ascending: false })
      );

      if (memberError) {
        const errorMessage = handleDatabaseError(memberError, 'fetch group members');
        throw new Error(errorMessage);
      }

      // Combine groups with their members
      const groupsWithDetails: GroupWithDetails[] = groups.map(group => {
        const groupMembers = memberData?.filter(m => m.group_id === group.id) || [];
        
        return {
          ...group,
          member_count: groupMembers.length,
          members: groupMembers.map(m => ({
            id: m.id,
            employee: m.employee as Pick<Employee, 'id' | 'first_name' | 'last_name' | 'position' | 'department'>,
            created_at: m.created_at,
          })),
        };
      });

      return groupsWithDetails;
    },
    enabled: !!company?.id,
  });
};

// Export group management hooks
export const useGroupManagement = () => {
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const addEmployeesToGroup = useAddEmployeesToGroup();
  const removeEmployeeFromGroup = useRemoveEmployeeFromGroup();

  return {
    createGroup,
    updateGroup,
    deleteGroup,
    addEmployeesToGroup,
    removeEmployeeFromGroup,
  };
};