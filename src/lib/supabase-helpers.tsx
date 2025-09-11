import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Example types based on your database schema
interface Employee {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  department: string;
  position: string;
  hire_date: string;
  hourly_rate: number;
  is_active: boolean;
}

interface TimeEntry {
  id: string;
  employee_id: string;
  start_time: string;
  end_time: string | null;
  break_duration: number;
  description: string;
  project: string;
  is_approved: boolean;
}

// Custom hook for fetching employees
export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('is_active', true)
          .order('last_name');

        if (error) throw error;
        setEmployees(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  return { employees, loading, error };
};

// Custom hook for fetching time entries
export const useTimeEntries = (employeeId?: string) => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeEntries = async () => {
      try {
        let query = supabase
          .from('time_entries')
          .select('*')
          .order('start_time', { ascending: false });

        if (employeeId) {
          query = query.eq('employee_id', employeeId);
        }

        const { data, error } = await query;

        if (error) throw error;
        setTimeEntries(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeEntries();
  }, [employeeId]);

  return { timeEntries, loading, error };
};

// Function to create a new time entry
export const createTimeEntry = async (timeEntry: Omit<TimeEntry, 'id'>) => {
  try {
    const { data, error } = await supabase
      .from('time_entries')
      .insert(timeEntry)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { 
      data: null, 
      error: err instanceof Error ? err.message : 'Failed to create time entry' 
    };
  }
};

// Function to update a time entry
export const updateTimeEntry = async (id: string, updates: Partial<TimeEntry>) => {
  try {
    const { data, error } = await supabase
      .from('time_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { 
      data: null, 
      error: err instanceof Error ? err.message : 'Failed to update time entry' 
    };
  }
};

// Function to clock in (create a new time entry with start_time)
export const clockIn = async (employeeId: string, description?: string, project?: string) => {
  return createTimeEntry({
    employee_id: employeeId,
    start_time: new Date().toISOString(),
    end_time: null,
    break_duration: 0,
    description: description || '',
    project: project || '',
    is_approved: false
  });
};

// Function to clock out (update existing time entry with end_time)
export const clockOut = async (timeEntryId: string) => {
  return updateTimeEntry(timeEntryId, {
    end_time: new Date().toISOString()
  });
};

// Example React component using the hooks
export const EmployeeList = () => {
  const { employees, loading, error } = useEmployees();

  if (loading) return <div>Loading employees...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Employees</h2>
      <div className="grid gap-4">
        {employees.map((employee) => (
          <div key={employee.id} className="p-4 border rounded-lg">
            <h3 className="font-semibold">
              {employee.first_name} {employee.last_name}
            </h3>
            <p className="text-sm text-gray-600">
              {employee.position} • {employee.department}
            </p>
            <p className="text-sm text-gray-500">{employee.email}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Example component for time tracking
export const TimeTracker = ({ employeeId }: { employeeId: string }) => {
  const { timeEntries, loading } = useTimeEntries(employeeId);
  const [isClockingIn, setIsClockingIn] = useState(false);

  const handleClockIn = async () => {
    setIsClockingIn(true);
    try {
      const { data, error } = await clockIn(employeeId, 'Working on project');
      if (error) {
        console.error('Clock in failed:', error);
      } else {
        console.log('Clocked in successfully:', data);
        // Refresh the time entries or update state
        window.location.reload(); // Simple refresh - in real app, update state
      }
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleClockOut = async (timeEntryId: string) => {
    try {
      const { data, error } = await clockOut(timeEntryId);
      if (error) {
        console.error('Clock out failed:', error);
      } else {
        console.log('Clocked out successfully:', data);
        // Refresh the time entries or update state
        window.location.reload(); // Simple refresh - in real app, update state
      }
    } catch (err) {
      console.error('Clock out error:', err);
    }
  };

  if (loading) return <div>Loading time entries...</div>;

  // Find active time entry (no end_time)
  const activeEntry = timeEntries.find(entry => !entry.end_time);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        {activeEntry ? (
          <button
            onClick={() => handleClockOut(activeEntry.id)}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clock Out
          </button>
        ) : (
          <button
            onClick={handleClockIn}
            disabled={isClockingIn}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isClockingIn ? 'Clocking In...' : 'Clock In'}
          </button>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold">Recent Time Entries</h3>
        <div className="space-y-2">
          {timeEntries.slice(0, 5).map((entry) => (
            <div key={entry.id} className="p-3 border rounded">
              <div className="flex justify-between">
                <span>{new Date(entry.start_time).toLocaleString()}</span>
                <span>
                  {entry.end_time 
                    ? new Date(entry.end_time).toLocaleString()
                    : 'Active'
                  }
                </span>
              </div>
              {entry.description && (
                <p className="text-sm text-gray-600">{entry.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
