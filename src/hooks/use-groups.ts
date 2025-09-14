import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuthContext } from '@/contexts/AuthContext';
import { withRetry, handleDatabaseError } from '@/lib/database-retry';

export type Group = Tables<'groups'>;

interface UseGroupsResult {
  groups: Group[];
  loading: boolean;
  error: string | null;
  refreshGroups: () => Promise<void>;
}

export const useGroups = (): UseGroupsResult => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { company } = useAuthContext();

  const refreshGroups = async () => {
    if (!company) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await withRetry(async () =>
        await supabase
          .from('groups')
          .select('*')
          .eq('company_id', company.id)
          .order('name')
      );

      if (fetchError) {
        const errorMessage = handleDatabaseError(fetchError, 'fetch groups');
        throw new Error(errorMessage);
      }

      setGroups(data as Group[] || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch groups';
      setError(errorMessage);
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshGroups();
  }, [company]);

  return {
    groups,
    loading,
    error,
    refreshGroups,
  };
};