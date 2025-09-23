import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Plus, Check, X, User, Clock, FileText, Settings, Trash2, Timer, Clock3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, isWithinInterval, startOfDay, differenceInMinutes } from "date-fns";
import { de } from "date-fns/locale";
import { useVacation, type VacationRequest, type Employee } from "@/hooks/use-vacation";
import { useCompanyEmployees } from "@/hooks/use-company-data";
import { useAuthContext } from "@/contexts/AuthContext";
import VacationEntitlementsManager from "@/components/VacationEntitlementsManager";
import { supabase } from "@/integrations/supabase/client";
import { useVacationEntitlements } from "@/hooks/use-vacation-entitlements";
import { generateVacationCalendarCSV, downloadCSV, generateVacationCalendarPDF } from "@/lib/csv-export";

// Using types from the vacation hook instead of local interfaces

interface OvertimeRecord {
  id: number;
  employeeId: number;
  date: string;
  hours: number;
  description: string;
  status: 'pending' | 'approved';
}

interface TimeEntry {
  id: number;
  date: string;
  start: string;
  end: string;
  duration: string;
  description?: string;
}

const Vacation = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showOvertimeDialog, setShowOvertimeDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VacationRequest | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [adminNote, setAdminNote] = useState("");
  const [overtimeStats, setOvertimeStats] = useState({
    totalOvertimeMinutes: 0,
    overtimeDays: 0,
    convertedOvertimeDays: 0, // Track converted overtime separately
    isLoading: true
  });
  const [daysToConvert, setDaysToConvert] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add refresh trigger state
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  // Auth context and database hooks
  const { employee, isAdmin, company } = useAuthContext();
  const { data: companyEmployees = [], isLoading: employeesLoading } = useCompanyEmployees();
  const {
    vacationRequests,
    loading: vacationLoading,
    error: vacationError,
    submitRequest,
    approveRequest,
    deleteRequest,
    getVacationStats,
    getEmployeeVacationDays,
    refreshRequests
  } = useVacation();
  
  const { 
    entitlements, 
    getEmployeeEntitlement, 
    getTotalVacationDays,
    updateEntitlement,
    refreshEntitlements
  } = useVacationEntitlements();

  // Get employee's configured work hours from Settings (fallback to 8 hours)
  const getEmployeeWorkHours = (): number => {
    if (!employee?.id) return 8;
    
    // Check if company has employee-specific work hours in settings with proper type checking
    if (company?.settings && typeof company.settings === 'object' && company.settings !== null && 'employee_work_hours' in company.settings) {
      const employeeWorkHours = company.settings.employee_work_hours;
      if (typeof employeeWorkHours === 'object' && employeeWorkHours !== null && employee.id in employeeWorkHours) {
        return employeeWorkHours[employee.id] as number;
      }
    }
    
    return 8; // Default
  };

  // Calculate overtime for the current employee (matching Dashboard calculation but with conceptual adjustment)
  const calculateOvertime = async () => {
    if (!employee?.id || !company?.created_at) return;
    
    try {
      setOvertimeStats(prev => ({ ...prev, isLoading: true }));
      
      // Fetch time entries for the current employee
      const { data: timeEntries, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employee.id)
        .not('end_time', 'is', null)
        .order('start_time', { ascending: false });
        
      if (error) {
        console.error('Error fetching time entries:', error);
        toast({
          title: "Fehler",
          description: "Überstunden konnen nicht berechnet werden.",
          variant: "destructive"
        });
        return;
      }
      
      // Get employee's configured work hours
      const dailyWorkHours = getEmployeeWorkHours();
      const dailyWorkMinutes = dailyWorkHours * 60;
      
      // Determine the start date: either beginning of the year or company creation date, whichever is later
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const companyCreationDate = new Date(company.created_at);
      const startDate = companyCreationDate > yearStart ? companyCreationDate : yearStart;
      
      // Filter time entries from start date to now
      const relevantEntries = timeEntries?.filter(entry => {
        const entryDate = new Date(entry.start_time);
        return entryDate >= startDate && entryDate <= now;
      }) || [];
      
      // Calculate total worked minutes
      const totalWorkedMinutes = relevantEntries.reduce((total, entry) => {
        if (entry.start_time && entry.end_time) {
          const start = new Date(entry.start_time);
          const end = new Date(entry.end_time);
          const durationMinutes = differenceInMinutes(end, start);
          return total + durationMinutes;
        }
        return total;
      }, 0);
      
      // Calculate expected work days (weekdays only)
      let expectedWorkDays = 0;
      const currentDate = new Date(startDate);
      const endDate = new Date(now);
      
      while (currentDate <= endDate) {
        // Check if it's a weekday (Monday-Friday)
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek > 0 && dayOfWeek < 6) { // 0 = Sunday, 6 = Saturday
          expectedWorkDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Calculate expected work minutes
      const expectedWorkMinutes = expectedWorkDays * dailyWorkMinutes;
      
      // Calculate overtime minutes (can be negative if worked less than expected)
      let overtimeMinutes = totalWorkedMinutes - expectedWorkMinutes;
      
      // Get converted overtime days from entitlement bonus_days field
      const currentYear = now.getFullYear();
      const entitlement = getEmployeeEntitlement(employee.id, currentYear);
      const convertedOvertimeDays = entitlement?.bonus_days && entitlement.bonus_days > 0 
        ? entitlement.bonus_days 
        : 0;
      
      // Conceptually adjust overtime minutes to reflect converted days
      // This reduces the actual overtime by the converted amount
      const convertedMinutes = convertedOvertimeDays * dailyWorkMinutes;
      overtimeMinutes = overtimeMinutes - convertedMinutes;
      
      // Calculate total overtime days (only count positive overtime)
      const totalOvertimeDays = Math.max(0, Math.floor(overtimeMinutes / dailyWorkMinutes));
      
      console.log('Overtime calculation details:', {
        totalWorkedMinutes,
        expectedWorkMinutes,
        rawOvertimeMinutes: totalWorkedMinutes - expectedWorkMinutes,
        convertedOvertimeDays,
        convertedMinutes,
        adjustedOvertimeMinutes: overtimeMinutes,
        totalOvertimeDays
      });
      
      setOvertimeStats(prev => ({
        totalOvertimeMinutes: overtimeMinutes, // Adjusted overtime (can be negative)
        overtimeDays: totalOvertimeDays, // Show only positive days available for conversion
        convertedOvertimeDays, // Track converted overtime days from bonus_days
        isLoading: false
      }));
    } catch (error) {
      console.error('Error calculating overtime:', error);
      setOvertimeStats(prev => ({ ...prev, isLoading: false }));
      toast({
        title: "Fehler",
        description: "Überstunden konnen nicht berechnet werden.",
        variant: "destructive"
      });
    }
  };

  // Convert overtime to vacation days
  const handleConvertOvertime = async () => {
    console.log('=== Starting Overtime Conversion ===');
    console.log('Initial state:', { 
      employeeId: employee?.id, 
      overtimeDays: overtimeStats.overtimeDays, 
      daysToConvert: daysToConvert,
      convertedOvertimeDays: overtimeStats.convertedOvertimeDays,
      totalOvertimeMinutes: overtimeStats.totalOvertimeMinutes
    });
    
    if (!employee?.id || overtimeStats.overtimeDays <= 0 || daysToConvert <= 0) {
      console.log('Validation failed:', { 
        employeeId: employee?.id, 
        overtimeDays: overtimeStats.overtimeDays, 
        daysToConvert 
      });
      return;
    }
    
    // Check if user is trying to convert more days than available
    if (daysToConvert > overtimeStats.overtimeDays) {
      toast({
        title: "Fehler",
        description: `Sie können maximal ${overtimeStats.overtimeDays} Tag(e) umrechnen.`,
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Get current year
      const currentYear = new Date().getFullYear();
      console.log('Current year:', currentYear);
      
      // Get employee's current entitlement
      let entitlement = getEmployeeEntitlement(employee.id, currentYear);
      console.log('Found entitlement:', entitlement);
      
      // If no entitlement exists for this year, we need to inform the user
      if (!entitlement) {
        toast({
          title: "Fehler",
          description: "Kein Urlaubsanspruch für dieses Jahr gefunden. Bitte wenden Sie sich an Ihren Administrator.",
          variant: "destructive"
        });
        return;
      }
      
      // Verify that the entitlement has a valid ID
      if (!entitlement.id) {
        toast({
          title: "Fehler",
          description: "Ungültiger Urlaubsanspruch gefunden. Bitte wenden Sie sich an Ihren Administrator.",
          variant: "destructive"
        });
        return;
      }
      
      // Update the entitlement to add bonus days for overtime
      const bonusDaysToAdd = daysToConvert;
      const currentBonusDays = entitlement.bonus_days || 0;
      const newBonusDays = currentBonusDays + bonusDaysToAdd;
      
      console.log('Bonus days calculation:', { 
        currentBonusDays, 
        bonusDaysToAdd, 
        newBonusDays 
      });
      
      // Prepare update data - update bonus_days and add to notes
      const updateData = {
        bonus_days: newBonusDays,
        notes: entitlement.notes 
          ? `${entitlement.notes}\n\n${new Date().toLocaleDateString('de-DE')}: ${bonusDaysToAdd} Tage aus Überstunden hinzugefügt`
          : `${new Date().toLocaleDateString('de-DE')}: ${bonusDaysToAdd} Tage aus Überstunden hinzugefügt`
      };
      
      // Log for debugging
      console.log('Updating entitlement with ID:', entitlement.id);
      console.log('Update data:', updateData);
      
      // Call updateEntitlement and handle any potential errors
      console.log('Calling updateEntitlement...');
      try {
        await updateEntitlement(entitlement.id, updateData);
        console.log('Update entitlement completed successfully');
      } catch (updateError) {
        console.error('Error in updateEntitlement:', updateError);
        throw updateError;
      }
      
      // Reset days to convert
      setDaysToConvert(1);
      
      setShowOvertimeDialog(false);
      
      // Refresh entitlements and vacation stats
      console.log('Refreshing entitlements...');
      await refreshEntitlements();
      console.log('Entitlements refreshed');
      
      // Add a small delay to ensure the refresh completes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recalculate overtime stats to reflect the conversion
      console.log('Recalculating overtime...');
      await calculateOvertime();
      console.log('Overtime recalculated');
      
      // Refresh vacation stats to show updated vacation days
      console.log('Refreshing vacation stats...');
      // Trigger a refresh of the vacation stats by invalidating the query
      refreshRequests();
      
      // Trigger a UI refresh
      setRefreshTrigger(prev => prev + 1);
      
      toast({
        title: "Erfolg",
        description: `Erfolgreich ${daysToConvert} Urlaubstag(e) aus Überstunden Ihrem Konto hinzugefügt. Ihre verbleibenden Überstunden wurden entsprechend reduziert.`
      });
      console.log('=== Overtime Conversion Completed ===');
    } catch (error: any) {
      console.error('=== Overtime Conversion Error ===');
      console.error('Error converting overtime:', error);
      console.error('Error stack:', error.stack);
      console.error('================================');
      
      // Provide more specific error messages based on the error type
      let errorMessage = "Überstunden konnten nicht umgerechnet werden.";
      if (error.message) {
        errorMessage += " " + error.message;
      }
      
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Load overtime stats when component mounts
  useEffect(() => {
    console.log('useEffect triggered - employee.id:', employee?.id, 'isAdmin:', isAdmin);
    if (employee?.id && !isAdmin) {
      console.log('Calculating overtime for employee:', employee.id);
      calculateOvertime();
    }
  }, [employee?.id]);

  // Add another useEffect to recalculate when entitlements change
  useEffect(() => {
    console.log('Entitlements changed, recalculating overtime if needed');
    console.log('Entitlements data:', entitlements);
    if (employee?.id && !isAdmin && entitlements && entitlements.length > 0) {
      console.log('Recalculating overtime due to entitlements change');
      calculateOvertime();
    }
  }, [entitlements, employee?.id]);

  // useEffect to trigger refresh when refreshTrigger changes
  useEffect(() => {
    // This will cause the component to re-render and recalculate vacation stats
    console.log('Refresh trigger changed, component will re-render');
  }, [refreshTrigger]);

  // Format employee name according to specification
  const formatEmployeeName = (emp: Employee): string => {
    if (!emp) return 'Unknown';
    const fullName = `${emp.first_name} ${emp.last_name}`;
    const nameParts = fullName.split(' ');
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      const lastNameInitial = nameParts[nameParts.length - 1].charAt(0);
      return `${firstName}. ${lastNameInitial}`;
    }
    return fullName;
  };

  // Get current employee ID
  const currentEmployeeId = employee?.id || '';
  
  // Get vacation statistics for current employee
  const vacationStats = getVacationStats(currentEmployeeId);

  const [requestForm, setRequestForm] = useState({
    startDate: "",
    endDate: "",
    reason: ""
  });

  // Calculate vacation statistics for a specific employee - now uses database hook
  const calculateVacationStats = (employeeId: string) => {
    return getVacationStats(employeeId);
  };

  // Calculate team-wide statistics for admin view
  const calculateTeamStats = () => {
    if (!companyEmployees.length || !vacationRequests.length) {
      return {
        totalDays: 0,
        usedDays: 0,
        pendingDays: 0,
        remainingDays: 0,
        availableDays: 0
      };
    }

    // Sum up all employees' vacation stats
    const teamStats = companyEmployees.reduce(
      (acc, emp) => {
        const empStats = getVacationStats(emp.id);
        return {
          totalDays: acc.totalDays + empStats.totalDays,
          usedDays: acc.usedDays + empStats.usedDays,
          pendingDays: acc.pendingDays + empStats.pendingDays,
          remainingDays: acc.remainingDays + empStats.remainingDays,
          availableDays: acc.availableDays + empStats.availableDays
        };
      },
      { totalDays: 0, usedDays: 0, pendingDays: 0, remainingDays: 0, availableDays: 0 }
    );

    return teamStats;
  };

  // Check if employee can request more vacation days
  const canRequestVacation = (): boolean => {
    if (isAdmin) return true; // Admin can always create requests
    return vacationStats.availableDays > 0;
  };

  // Get maximum requestable days
  const getMaxRequestableDays = (): number => {
    if (isAdmin) return 365; // Admin can request any amount
    return Math.max(0, vacationStats.availableDays);
  };

  // Calculate days between dates
  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Filter vacation requests based on user role and selected employee
  const getFilteredRequests = () => {
    let filtered = vacationRequests;

    if (selectedEmployee !== "all") {
      filtered = filtered.filter(req => req.employee_id === selectedEmployee);
    }

    return filtered;
  };

  // Get vacation days for calendar display
  const getVacationDays = (): Date[] => {
    const vacationDays: Date[] = [];
    const approvedRequests = vacationRequests.filter(req => req.status === 'approved');
    
    approvedRequests.forEach(request => {
      const start = new Date(request.start_date);
      const end = new Date(request.end_date);
      
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        vacationDays.push(new Date(d));
      }
    });
    
    return vacationDays;
  };

  // Handle vacation request submission
  const handleSubmitRequest = async () => {
    if (!requestForm.startDate || !requestForm.endDate || !requestForm.reason) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive"
      });
      return;
    }

    const requestedDays = calculateDays(requestForm.startDate, requestForm.endDate);
    const maxDays = getMaxRequestableDays();
    
    // Check if user has enough vacation days available
    if (!isAdmin && requestedDays > maxDays) {
      toast({
        title: "Nicht genügend Urlaubstage",
        description: `Sie haben nur noch ${maxDays} Urlaubstage verfügbar. Sie können nicht ${requestedDays} Tage beantragen.`,
        variant: "destructive"
      });
      return;
    }

    try {
      await submitRequest({
        start_date: requestForm.startDate,
        end_date: requestForm.endDate,
        days_requested: requestedDays,
        reason: requestForm.reason
      });
      
      setRequestForm({ startDate: "", endDate: "", reason: "" });
      setShowRequestDialog(false);
    } catch (error) {
      // Error handling is done in the hook
      console.error('Error submitting request:', error);
    }
  };

  // Handle admin approval/rejection
  const handleApprovalAction = async (action: 'approved' | 'rejected') => {
    if (!selectedRequest) return;

    try {
      await approveRequest(selectedRequest.id, {
        status: action,
        admin_note: adminNote
      });
      
      setShowApprovalDialog(false);
      setSelectedRequest(null);
      setAdminNote("");
    } catch (error) {
      // Error handling is done in the hook
      console.error('Error approving request:', error);
    }
  };

  // Handle vacation request deletion/revocation
  const handleDeleteRequest = async () => {
    if (!selectedRequest) return;

    try {
      await deleteRequest(selectedRequest.id);
      
      setShowDeleteDialog(false);
      setSelectedRequest(null);
    } catch (error) {
      // Error handling is done in the hook
      console.error('Error deleting request:', error);
    }
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Genehmigt</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Abgelehnt</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Ausstehend</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Check if employee can edit this request
  const canEditRequest = (request: VacationRequest): boolean => {
    if (isAdmin) return true;
    return request.employee_id === currentEmployeeId && request.status === 'pending';
  };

  // Check if employee can delete/revoke this request
  const canDeleteRequest = (request: VacationRequest): boolean => {
    if (isAdmin) return true;
    return request.employee_id === currentEmployeeId && (request.status === 'approved' || request.status === 'pending');
  };

  // Export vacation calendar as CSV
  const handleExportCalendar = async (format: 'csv' | 'pdf') => {
    try {
      // Get current year
      const currentYear = new Date().getFullYear();
      
      // Fetch all vacation requests for the company
      const { data: allVacationRequests, error: requestsError } = await supabase
        .from('vacation_requests')
        .select(`
          *,
          employee:employees!vacation_requests_employee_id_fkey(*)
        `)
        .eq('status', 'approved');
        
      if (requestsError) {
        toast({
          title: "Fehler",
          description: "Urlaubsanträge konnten nicht abgerufen werden.",
          variant: "destructive"
        });
        return;
      }
      
      // Filter by company on the client side
      const companyRequests = (allVacationRequests || []).filter(
        request => request.employee?.company_id === company?.id
      );
      
      if (format === 'csv') {
        // Generate CSV data
        const csvData = generateVacationCalendarCSV(companyRequests, companyEmployees, currentYear);
        
        // Download CSV file
        downloadCSV(csvData, `urlaubsplan-${currentYear}.csv`);
      } else {
        // Generate PDF with company name
        generateVacationCalendarPDF(companyRequests, companyEmployees, currentYear, company?.name);
      }
      
      toast({
        title: "Export erfolgreich",
        description: `Der Urlaubsplan für ${currentYear} wurde als ${format.toUpperCase()} exportiert.`
      });
      
      setShowExportDialog(false);
    } catch (error) {
      console.error('Error exporting calendar:', error);
      toast({
        title: "Fehler",
        description: "Der Urlaubsplan konnte nicht exportiert werden.",
        variant: "destructive"
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Urlaubsplanung</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {isAdmin 
                ? "Verwalten Sie Urlaubsanträge und genehmigen Sie Urlaub" 
                : "Verwalten Sie Ihre Urlaubsanträge und sehen Sie Team-Urlaube"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => setShowRequestDialog(true)}
              disabled={!canRequestVacation()}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Urlaub beantragen
            </Button>
            {isAdmin && (
              <Button 
                onClick={() => setShowExportDialog(true)}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <FileText className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}
            {!isAdmin && (
              <Button 
                onClick={() => setShowOvertimeDialog(true)}
                disabled={overtimeStats.overtimeDays <= 0}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Clock3 className="mr-2 h-4 w-4" />
                Überstunden umrechnen
              </Button>
            )}
            {!canRequestVacation() && !isAdmin && (
              <span className="text-sm text-muted-foreground self-center ml-0 sm:ml-2 mt-2 sm:mt-0">
                Keine Urlaubstage verfügbar
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Calendar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Urlaubskalender</CardTitle>
              <CardDescription>Übersicht genehmigter Urlaubstage</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  vacation: getVacationDays()
                }}
                modifiersStyles={{
                  vacation: { backgroundColor: '#dcfce7', color: '#166534', fontWeight: 'bold' }
                }}
                locale={de}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="requests" className="w-full">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
                <TabsTrigger value="requests">Urlaubsanträge</TabsTrigger>
                {isAdmin && <TabsTrigger value="entitlements">Ansprüche verwalten</TabsTrigger>}
              </TabsList>
              
              <TabsContent value="requests" className="space-y-4">
                {/* Vacation Requests Content */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <div>
                        <CardTitle>Urlaubsanträge</CardTitle>
                        <CardDescription>
                          {isAdmin ? "Alle Urlaubsanträge verwalten" : "Urlaubsanträge des Teams"}
                        </CardDescription>
                      </div>
                      {isAdmin && (
                        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                          <SelectTrigger className="w-full sm:w-48">
                            <SelectValue placeholder="Mitarbeiter auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                            {companyEmployees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {formatEmployeeName(employee)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
              <div className="space-y-4">
                {vacationLoading ? (
                  <p className="text-muted-foreground text-center py-8">
                    Urlaubsanträge werden geladen...
                  </p>
                ) : getFilteredRequests().length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Keine Urlaubsanträge vorhanden
                  </p>
                ) : (
                  getFilteredRequests().map((request) => {
                    const requestEmployee = request.employee;
                    return (
                      <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <User className="h-8 w-8 text-muted-foreground p-1 bg-muted rounded-full" />
                          <div className="space-y-1 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">{requestEmployee ? formatEmployeeName(requestEmployee) : 'Unknown Employee'}</p>
                              {getStatusBadge(request.status)}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-33 w-3" />
                                {format(new Date(request.start_date), "dd.MM.yyyy", { locale: de })} - {format(new Date(request.end_date), "dd.MM.yyyy", { locale: de })}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {request.days_requested} Tag{request.days_requested !== 1 ? 'e' : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <FileText className="h-3 w-3" />
                              {request.reason}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {isAdmin && request.status === 'pending' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowApprovalDialog(true);
                              }}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          )}
                          {canDeleteRequest(request) && request.employee_id === currentEmployeeId && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowDeleteDialog(true);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          {request.status === 'pending' && request.employee_id === currentEmployeeId && !isAdmin && (
                            <Badge variant="outline">Bearbeitbar</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="entitlements">
            <VacationEntitlementsManager />
          </TabsContent>
        )}
        </Tabs>
      </div>
    </div>

    {/* Vacation Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Urlaubsstatistiken</CardTitle>
          <CardDescription>
            Übersicht über Ihre persönlichen Urlaubstage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Gesamte Urlaubstage
              </p>
              <p className="text-2xl font-bold">{vacationStats.totalDays}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Verwendete Urlaubstage
              </p>
              <p className="text-2xl font-bold">{vacationStats.usedDays}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Verbleibende Urlaubstage
              </p>
              <p className={`text-2xl font-bold ${
                vacationStats.remainingDays <= 0 ? 'text-red-600' : 
                vacationStats.remainingDays <= 5 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {vacationStats.remainingDays}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Ausstehende Anträge
              </p>
              <p className="text-2xl font-bold text-yellow-600">
                {vacationRequests.filter(req => 
                  req.status === 'pending' && req.employee_id === currentEmployeeId
                ).length}
              </p>
            </div>
          </div>
            
          {/* Additional stats for all users */}
          <div className="mt-4 pt-4 border-t">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Beantragte Tage (ausstehend)</p>
                <p className="text-2xl font-bold text-blue-600">{vacationStats.pendingDays}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Verfügbare Tage für neue Anträge</p>
                <p className={`text-2xl font-bold ${
                  vacationStats.availableDays <= 0 ? 'text-red-600' : 
                  vacationStats.availableDays <= 3 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {vacationStats.availableDays}
                </p>
              </div>
            </div>
            {vacationStats.availableDays <= 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  ⚠️ Sie haben alle verfügbaren Urlaubstage aufgebraucht oder beantragt. 
                  Neue Anträge sind erst nach Genehmigung oder Stornierung bestehender Anträge möglich.
                </p>
              </div>
            )}
            
            {/* Overtime stats for non-admin users */}
            {!isAdmin && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Clock3 className="mr-2 h-4 w-4" />
                      Verfügbare Überstunden
                    </p>
                    <p className={`text-2xl font-bold ${
                      overtimeStats.totalOvertimeMinutes <= 0 ? 'text-muted-foreground' : 'text-blue-600'
                    }`}>
                      {overtimeStats.isLoading ? 'Lädt...' : `${Math.floor(Math.abs(overtimeStats.totalOvertimeMinutes) / 60)}h ${Math.abs(overtimeStats.totalOvertimeMinutes) % 60}min`}
                      <span className="text-sm block">
                        ({overtimeStats.totalOvertimeMinutes >= 0 ? '+' : '-'}{Math.floor(Math.abs(overtimeStats.totalOvertimeMinutes) / (getEmployeeWorkHours() * 60))} Tage)
                      </span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Umrechenbare Urlaubstage</p>
                    <p className={`text-2xl font-bold ${
                      overtimeStats.overtimeDays <= 0 ? 'text-muted-foreground' : 'text-green-600'
                    }`}>
                      {overtimeStats.isLoading ? 'Lädt...' : overtimeStats.overtimeDays}
                      {overtimeStats.convertedOvertimeDays > 0 && (
                        <span className="text-sm block text-muted-foreground">
                          ({overtimeStats.convertedOvertimeDays} bereits umgerechnet)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {overtimeStats.convertedOvertimeDays > 0 && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✓ Sie haben bereits {overtimeStats.convertedOvertimeDays} Tag(e) aus Überstunden in Urlaubstage umgerechnet.
                    </p>
                  </div>
                )}
                {overtimeStats.overtimeDays > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      ⚠️ Sie haben {overtimeStats.overtimeDays} Tag(e) an Überstunden, die Sie in Urlaubstage umrechnen können.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Request Vacation Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Urlaubsantrag stellen</DialogTitle>
            <DialogDescription>
              Stellen Sie einen neuen Urlaubsantrag zur Genehmigung
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Startdatum</Label>
                <Input 
                  type="date" 
                  value={requestForm.startDate}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Enddatum</Label>
                <Input 
                  type="date" 
                  value={requestForm.endDate}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
            {requestForm.startDate && requestForm.endDate && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Anzahl Urlaubstage: <span className="font-semibold">{calculateDays(requestForm.startDate, requestForm.endDate)}</span>
                  </p>
                  {!isAdmin && (
                    <p className="text-sm text-muted-foreground">
                      Verfügbare Tage: <span className={`font-semibold ${
                        getMaxRequestableDays() >= calculateDays(requestForm.startDate, requestForm.endDate) 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {getMaxRequestableDays()}
                      </span>
                    </p>
                  )}
                  {!isAdmin && calculateDays(requestForm.startDate, requestForm.endDate) > getMaxRequestableDays() && (
                    <p className="text-sm text-red-600 font-medium">
                      ⚠️ Nicht genügend Urlaubstage verfügbar!
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Grund</Label>
              <Textarea 
                placeholder="Geben Sie den Grund für Ihren Urlaubsantrag an..."
                value={requestForm.reason}
                onChange={(e) => setRequestForm(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Abbrechen</Button>
            <Button 
              onClick={handleSubmitRequest}
              disabled={!isAdmin && requestForm.startDate && requestForm.endDate && calculateDays(requestForm.startDate, requestForm.endDate) > getMaxRequestableDays()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Antrag einreichen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Approval Dialog */}
      {isAdmin && (
        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Urlaubsantrag bearbeiten</DialogTitle>
              <DialogDescription>
                {selectedRequest && (
                  <>Antrag vom {format(new Date(selectedRequest.created_at || ''), "dd.MM.yyyy", { locale: de })}</>
                )}
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Zeitraum:</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedRequest.start_date), "dd.MM.yyyy", { locale: de })} - {format(new Date(selectedRequest.end_date), "dd.MM.yyyy", { locale: de })} ({selectedRequest.days_requested} Tage)
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Grund:</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.reason}</p>
                </div>
                <div className="space-y-2">
                  <Label>Administratornotiz (optional)</Label>
                  <Textarea 
                    placeholder="Notiz zur Genehmigung oder Ablehnung..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>Abbrechen</Button>
              <Button variant="destructive" onClick={() => handleApprovalAction('rejected')}>
                <X className="mr-2 h-4 w-4" />
                Ablehnen
              </Button>
              <Button onClick={() => handleApprovalAction('approved')}>
                <Check className="mr-2 h-4 w-4" />
                Genehmigen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete/Revoke Vacation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Urlaubsantrag stornieren</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>Möchten Sie Ihren Urlaubsantrag vom {format(new Date(selectedRequest.created_at || ''), "dd.MM.yyyy", { locale: de })} wirklich stornieren?</>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <X className="h-4 w-4 text-red-600" />
                  <p className="text-sm font-medium text-red-800">Achtung: Diese Aktion kann nicht rückgängig gemacht werden</p>
                </div>
                <p className="text-sm text-red-700">
                  {selectedRequest.status === 'approved' 
                    ? 'Ihr genehmigter Urlaubsantrag wird vollständig entfernt und die Urlaubstage werden wieder zu Ihrem Konto hinzugefügt.' 
                    : 'Ihr ausstehender Urlaubsantrag wird entfernt.'}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Urlaubsdetails:</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><span className="font-medium">Zeitraum:</span> {format(new Date(selectedRequest.start_date), "dd.MM.yyyy", { locale: de })} - {format(new Date(selectedRequest.end_date), "dd.MM.yyyy", { locale: de })}</p>
                  <p><span className="font-medium">Tage:</span> {selectedRequest.days_requested} Tag{selectedRequest.days_requested !== 1 ? 'e' : ''}</p>
                  <p><span className="font-medium">Status:</span> {selectedRequest.status === 'approved' ? 'Genehmigt' : selectedRequest.status === 'pending' ? 'Ausstehend' : 'Abgelehnt'}</p>
                  <p><span className="font-medium">Grund:</span> {selectedRequest.reason}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDeleteRequest}>
              <Trash2 className="mr-2 h-4 w-4" />
              Urlaubsantrag stornieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overtime Conversion Dialog */}
      <Dialog open={showOvertimeDialog} onOpenChange={(open) => {
        setShowOvertimeDialog(open);
        if (!open) {
          // Reset days to convert when dialog is closed
          setDaysToConvert(1);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Überstunden in Urlaubstage umrechnen</DialogTitle>
            <DialogDescription>
              Wandeln Sie Ihre Überstunden in zusätzliche Urlaubstage um
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="space-y-2">
                <p className="text-sm font-medium">Verfügbare Überstunden</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.floor(Math.abs(overtimeStats.totalOvertimeMinutes) / 60)} Stunden und {Math.abs(overtimeStats.totalOvertimeMinutes) % 60} Minuten
                  <span className="text-sm block">
                    ({overtimeStats.totalOvertimeMinutes >= 0 ? '+' : '-'}{Math.floor(Math.abs(overtimeStats.totalOvertimeMinutes) / (getEmployeeWorkHours() * 60))} Tage)
                  </span>
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="space-y-2">
                <p className="text-sm font-medium">Umrechenbare Urlaubstage</p>
                <p className="text-2xl font-bold text-green-600">
                  {overtimeStats.overtimeDays} Tag{overtimeStats.overtimeDays !== 1 ? 'e' : ''}
                </p>
                <p className="text-sm text-muted-foreground">
                  Basierend auf Ihrer täglichen Arbeitszeit von {getEmployeeWorkHours()} Stunden
                </p>
              </div>
            </div>
            
            {/* Days selection */}
            <div className="space-y-2">
              <Label htmlFor="days-to-convert">Anzahl der umzurechnenden Tage</Label>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDaysToConvert(prev => Math.max(1, prev - 1))}
                  disabled={daysToConvert <= 1}
                >
                  -
                </Button>
                <Input
                  id="days-to-convert"
                  type="number"
                  min="1"
                  max={overtimeStats.overtimeDays}
                  value={daysToConvert}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 1 && value <= overtimeStats.overtimeDays) {
                      setDaysToConvert(value);
                    }
                  }}
                  className="w-20 text-center"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDaysToConvert(prev => Math.min(overtimeStats.overtimeDays, prev + 1))}
                  disabled={daysToConvert >= overtimeStats.overtimeDays}
                >
                  +
                </Button>
                <span className="text-sm text-muted-foreground ml-2">
                  von max. {overtimeStats.overtimeDays}
                </span>
              </div>
            </div>
            
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Diese Aktion wandelt Ihre Überstunden dauerhaft in zusätzliche Urlaubstage um. 
                Die umgerechneten Tage werden Ihrem Urlaubskonto als Bonus-Tage hinzugefügt und können wie reguläre Urlaubstage beantragt werden.
                Ihre Gesamtüberstunden werden um die umgerechneten Tage reduziert.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOvertimeDialog(false)}>Abbrechen</Button>
            <Button 
              onClick={handleConvertOvertime}
              disabled={overtimeStats.overtimeDays <= 0 || daysToConvert <= 0 || daysToConvert > overtimeStats.overtimeDays}
            >
              <Clock3 className="mr-2 h-4 w-4" />
              Umrechnen und hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export-Format auswählen</DialogTitle>
            <DialogDescription>
              Wählen Sie das Format für den Export des Urlaubsplans
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Button 
              onClick={() => handleExportCalendar('csv')}
              className="w-full"
            >
              <FileText className="mr-2 h-4 w-4" />
              CSV-Datei exportieren
            </Button>
            <Button 
              onClick={() => handleExportCalendar('pdf')}
              variant="outline"
              className="w-full"
            >
              <FileText className="mr-2 h-4 w-4" />
              PDF-Datei exportieren
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Abbrechen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
    </DashboardLayout>
  );
};

export default Vacation;