import { useState } from "react";
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
import { Calendar as CalendarIcon, Plus, Check, X, User, Clock, FileText, Settings, Trash2, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, isWithinInterval, startOfDay } from "date-fns";
import { de } from "date-fns/locale";

interface Employee {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
}

interface VacationRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  adminNote?: string;
  isOvertimeRequest?: boolean; // Flag to identify overtime-based requests
}

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
  
  // Get user role from localStorage (similar to other pages)
  const userRole = localStorage.getItem("userRole") || "employee";
  const currentUserId = parseInt(localStorage.getItem("currentUserId") || "1");

  // Sample data - would come from API in real application
  const allEmployees: Employee[] = [
    { id: 1, name: "Max Mustermann", email: "max.mustermann@company.com", position: "Erzieher", department: "Kita" },
    { id: 2, name: "Anna Schmidt", email: "anna.schmidt@company.com", position: "Erzieherin", department: "Kita" },
    { id: 3, name: "Thomas Weber", email: "thomas.weber@company.com", position: "Kita - Leitung", department: "Management" },
    { id: 4, name: "Lisa Müller", email: "lisa.mueller@company.com", position: "FSJ", department: "Ausbildung" },
  ];

  // Vacation entitlements by employee (would come from API/database)
  const vacationEntitlements: Record<number, number> = {
    1: 30, // Max Mustermann
    2: 28, // Anna Schmidt
    3: 35, // Thomas Weber (management gets more days)
    4: 24, // Lisa Müller (FSJ gets fewer days)
  };

  // Sample overtime data - would come from API in real application
  const [overtimeRecords] = useState<OvertimeRecord[]>([]);

  // Get time tracking data for overtime calculation (in real app, this would come from API)
  const getTimeTrackingData = (): TimeEntry[] => {
    return [
      { id: 1, date: "2024-01-15", start: "09:00", end: "12:30", duration: "3h 30min", description: "Vormittagsarbeit" },
      { id: 2, date: "2024-01-15", start: "13:30", end: "19:45", duration: "6h 15min", description: "Nachmittagsarbeit mit Überstunden" },
      { id: 3, date: "2024-01-14", start: "08:30", end: "12:00", duration: "3h 30min", description: "Vormittagsschicht" },
      { id: 4, date: "2024-01-14", start: "13:00", end: "19:30", duration: "6h 30min", description: "Nachmittagsschicht mit Überstunden" },
      { id: 5, date: "2024-01-16", start: "08:00", end: "20:00", duration: "12h 00min", description: "Langer Arbeitstag mit 4h Überstunden" },
      { id: 6, date: "2024-01-17", start: "09:00", end: "19:00", duration: "10h 00min", description: "Weiterer Tag mit 2h Überstunden" },
    ];
  };

  // Get employee's configured work hours from Settings
  const getEmployeeWorkHours = (employeeId: number): number => {
    const workHourSettings = localStorage.getItem("workHourSettings");
    if (workHourSettings) {
      const settings = JSON.parse(workHourSettings);
      const employeeSetting = settings.find((setting: any) => setting.employeeId === employeeId);
      if (employeeSetting) {
        return employeeSetting.workHoursPerDay;
      }
    }
    // Default to 8 hours if no setting found
    return 8;
  };

  // Calculate overtime from time tracking data
  const calculateOvertimeFromTimeTracking = (employeeId: number) => {
    const timeEntries = getTimeTrackingData();
    const EMPLOYEE_WORK_HOURS = getEmployeeWorkHours(employeeId);
    const MINUTES_PER_HOUR = 60;
    const EMPLOYEE_WORK_MINUTES = EMPLOYEE_WORK_HOURS * MINUTES_PER_HOUR;

    const calculateDurationInMinutes = (start: string, end: string): number => {
      const startTime = new Date(`2024-01-01T${start}:00`);
      const endTime = new Date(`2024-01-01T${end}:00`);
      return Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60);
    };

    const calculateDailyWorkedMinutes = (date: string): number => {
      return timeEntries
        .filter(entry => entry.date === date)
        .reduce((total, entry) => {
          return total + calculateDurationInMinutes(entry.start, entry.end);
        }, 0);
    };

    const getUniqueDates = (): string[] => {
      return Array.from(new Set(timeEntries.map(entry => entry.date))).sort();
    };

    const uniqueDates = getUniqueDates();
    const totalOvertimeMinutes = uniqueDates.reduce((total, date) => {
      const workedMinutes = calculateDailyWorkedMinutes(date);
      const overtimeMinutes = Math.max(0, workedMinutes - EMPLOYEE_WORK_MINUTES);
      return total + overtimeMinutes;
    }, 0);

    const totalOvertimeHours = totalOvertimeMinutes / MINUTES_PER_HOUR;
    const availableOvertimeDays = Math.floor(totalOvertimeHours / EMPLOYEE_WORK_HOURS);
    const usedOvertimeDays = vacationRequests
      .filter(req => req.employeeId === employeeId && req.isOvertimeRequest && req.status === 'approved')
      .reduce((sum, req) => sum + req.days, 0);

    return {
      totalOvertimeHours,
      availableOvertimeDays: Math.max(0, availableOvertimeDays - usedOvertimeDays),
      usedOvertimeDays,
      remainingOvertimeHours: totalOvertimeHours % EMPLOYEE_WORK_HOURS
    };
  };

  const [overtimeForm, setOvertimeForm] = useState({
    requestedDays: 1,
    reason: "",
    startDate: "",
    endDate: ""
  });

  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([
    {
      id: 1,
      employeeId: 1,
      employeeName: "Max Mustermann",
      startDate: "2024-02-15",
      endDate: "2024-02-19",
      days: 5,
      reason: "Familienurlaub",
      status: "approved",
      requestDate: "2024-01-20"
    },
    {
      id: 2,
      employeeId: 2,
      employeeName: "Anna Schmidt",
      startDate: "2024-03-01",
      endDate: "2024-03-05",
      days: 5,
      reason: "Erholung",
      status: "pending",
      requestDate: "2024-01-25"
    },
    {
      id: 3,
      employeeId: 1,
      employeeName: "Max Mustermann",
      startDate: "2024-04-10",
      endDate: "2024-04-12",
      days: 3,
      reason: "Persönliche Angelegenheiten",
      status: "pending",
      requestDate: "2024-02-01"
    }
  ]);

  const [requestForm, setRequestForm] = useState({
    startDate: "",
    endDate: "",
    reason: ""
  });

  // Calculate vacation statistics for a specific employee
  const calculateVacationStats = (employeeId: number) => {
    const totalDays = vacationEntitlements[employeeId] || 30;
    const employeeRequests = vacationRequests.filter(req => req.employeeId === employeeId);
    
    const usedDays = employeeRequests
      .filter(req => req.status === 'approved')
      .reduce((sum, req) => sum + req.days, 0);
    
    const pendingDays = employeeRequests
      .filter(req => req.status === 'pending')
      .reduce((sum, req) => sum + req.days, 0);
    
    const remainingDays = totalDays - usedDays;
    const availableDays = remainingDays - pendingDays;
    
    return {
      totalDays,
      usedDays,
      pendingDays,
      remainingDays,
      availableDays
    };
  };

  // Calculate team-wide statistics for admin view
  const calculateTeamStats = () => {
    const totalTeamDays = Object.values(vacationEntitlements).reduce((sum, days) => sum + days, 0);
    
    const usedTeamDays = vacationRequests
      .filter(req => req.status === 'approved')
      .reduce((sum, req) => sum + req.days, 0);
    
    const pendingTeamDays = vacationRequests
      .filter(req => req.status === 'pending')
      .reduce((sum, req) => sum + req.days, 0);
    
    const remainingTeamDays = totalTeamDays - usedTeamDays;
    
    return {
      totalDays: totalTeamDays,
      usedDays: usedTeamDays,
      pendingDays: pendingTeamDays,
      remainingDays: remainingTeamDays,
      availableDays: remainingTeamDays - pendingTeamDays
    };
  };

  // Get statistics based on user role
  const getVacationStats = () => {
    // Both admin and employee see their personal statistics
    return calculateVacationStats(currentUserId);
  };

  const vacationStats = getVacationStats();

  // Check if employee can request more vacation days
  const canRequestVacation = (): boolean => {
    if (userRole === "admin") return true; // Admin can always create requests for testing
    
    const userStats = calculateVacationStats(currentUserId);
    return userStats.availableDays > 0;
  };

  // Get maximum requestable days
  const getMaxRequestableDays = (): number => {
    if (userRole === "admin") return 365; // Admin can request any amount for testing
    
    const userStats = calculateVacationStats(currentUserId);
    return Math.max(0, userStats.availableDays);
  };

  // Calculate overtime statistics for a specific employee
  const calculateOvertimeStats = (employeeId: number) => {
    return calculateOvertimeFromTimeTracking(employeeId);
  };

  // Format employee name according to specification
  const formatEmployeeName = (employee: Employee): string => {
    const nameParts = employee.name.split(' ');
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      const lastNameInitial = nameParts[nameParts.length - 1].charAt(0);
      return `${firstName}. ${lastNameInitial}`;
    }
    return employee.name;
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
  const getFilteredRequests = (): VacationRequest[] => {
    let filtered = vacationRequests;
    
    if (userRole === "employee") {
      // Employees can see all requests but only edit their own
      filtered = vacationRequests;
    } else {
      // Admin sees all requests
      filtered = vacationRequests;
    }

    if (selectedEmployee !== "all") {
      filtered = filtered.filter(req => req.employeeId === parseInt(selectedEmployee));
    }

    return filtered;
  };

  // Get vacation days for calendar display
  const getVacationDays = (): Date[] => {
    const vacationDays: Date[] = [];
    const approvedRequests = vacationRequests.filter(req => req.status === 'approved');
    
    approvedRequests.forEach(request => {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        vacationDays.push(new Date(d));
      }
    });
    
    return vacationDays;
  };

  // Handle vacation request submission
  const handleSubmitRequest = () => {
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
    if (userRole !== "admin" && requestedDays > maxDays) {
      toast({
        title: "Nicht genügend Urlaubstage",
        description: `Sie haben nur noch ${maxDays} Urlaubstage verfügbar. Sie können nicht ${requestedDays} Tage beantragen.`,
        variant: "destructive"
      });
      return;
    }

    const currentEmployee = allEmployees.find(emp => emp.id === currentUserId);
    
    const newRequest: VacationRequest = {
      id: Math.max(...vacationRequests.map(r => r.id)) + 1,
      employeeId: currentUserId,
      employeeName: currentEmployee?.name || "Unknown",
      startDate: requestForm.startDate,
      endDate: requestForm.endDate,
      days: requestedDays,
      reason: requestForm.reason,
      status: "pending",
      requestDate: format(new Date(), "yyyy-MM-dd")
    };

    setVacationRequests(prev => [...prev, newRequest]);
    setRequestForm({ startDate: "", endDate: "", reason: "" });
    setShowRequestDialog(false);
    
    toast({
      title: "Urlaubsantrag eingereicht",
      description: "Ihr Urlaubsantrag wurde erfolgreich eingereicht und wartet auf Genehmigung."
    });
  };

  // Handle admin approval/rejection
  const handleApprovalAction = (action: 'approved' | 'rejected', adminNote?: string) => {
    if (!selectedRequest) return;

    setVacationRequests(prev => 
      prev.map(req => 
        req.id === selectedRequest.id 
          ? { ...req, status: action, adminNote }
          : req
      )
    );

    setShowApprovalDialog(false);
    setSelectedRequest(null);
    
    toast({
      title: action === 'approved' ? "Antrag genehmigt" : "Antrag abgelehnt",
      description: `Der Urlaubsantrag von ${selectedRequest.employeeName} wurde ${action === 'approved' ? 'genehmigt' : 'abgelehnt'}.`
    });
  };

  // Handle vacation request deletion/revocation
  const handleDeleteRequest = () => {
    if (!selectedRequest) return;

    setVacationRequests(prev => 
      prev.filter(req => req.id !== selectedRequest.id)
    );

    setShowDeleteDialog(false);
    setSelectedRequest(null);
    
    toast({
      title: "Urlaubsantrag storniert",
      description: "Ihr Urlaubsantrag wurde erfolgreich storniert."
    });
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
    if (userRole === "admin") return true;
    return request.employeeId === currentUserId && request.status === 'pending';
  };

  // Check if employee can delete/revoke this request
  const canDeleteRequest = (request: VacationRequest): boolean => {
    if (userRole === "admin") return true;
    return request.employeeId === currentUserId && (request.status === 'approved' || request.status === 'pending');
  };

  // Handle overtime-based vacation request
  const handleOvertimeRequest = () => {
    if (!overtimeForm.reason || overtimeForm.requestedDays <= 0 || !overtimeForm.startDate || !overtimeForm.endDate) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive"
      });
      return;
    }

    const overtimeStats = calculateOvertimeStats(currentUserId);
    
    if (overtimeForm.requestedDays > overtimeStats.availableOvertimeDays) {
      toast({
        title: "Nicht genügend Überstunden",
        description: `Sie haben nur ${overtimeStats.availableOvertimeDays} verfügbare Überstunden-Tage. Sie können nicht ${overtimeForm.requestedDays} Tage beantragen.`,
        variant: "destructive"
      });
      return;
    }

    const currentEmployee = allEmployees.find(emp => emp.id === currentUserId);
    
    const newRequest: VacationRequest = {
      id: Math.max(...vacationRequests.map(r => r.id)) + 1,
      employeeId: currentUserId,
      employeeName: currentEmployee?.name || "Unknown",
      startDate: overtimeForm.startDate,
      endDate: overtimeForm.endDate,
      days: overtimeForm.requestedDays,
      reason: `Überstundenausgleich: ${overtimeForm.reason}`,
      status: "approved", // Overtime requests are auto-approved
      requestDate: format(new Date(), "yyyy-MM-dd"),
      isOvertimeRequest: true
    };

    setVacationRequests(prev => [...prev, newRequest]);
    setOvertimeForm({ requestedDays: 1, reason: "", startDate: "", endDate: "" });
    setShowOvertimeDialog(false);
    
    toast({
      title: "Überstundenausgleich genehmigt",
      description: `${overtimeForm.requestedDays} freie Tag(e) durch Überstundenausgleich wurden automatisch genehmigt.`
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Urlaubsplanung</h1>
            <p className="text-muted-foreground">
              {userRole === "admin" 
                ? "Verwalten Sie Urlaubsanträge und genehmigen Sie Urlaub" 
                : "Verwalten Sie Ihre Urlaubsanträge und sehen Sie Team-Urlaube"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowRequestDialog(true)}
              disabled={!canRequestVacation()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Urlaub beantragen
            </Button>
            {calculateOvertimeStats(currentUserId).availableOvertimeDays > 0 && (
              <Button 
                onClick={() => setShowOvertimeDialog(true)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Timer className="mr-2 h-4 w-4" />
                Überstunden einlösen
              </Button>
            )}
            {!canRequestVacation() && userRole === "employee" && (
              <span className="text-sm text-muted-foreground self-center ml-2">
                Keine Urlaubstage verfügbar
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Calendar */}
          <Card className="md:col-span-1">
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
              />
            </CardContent>
          </Card>

          {/* Vacation Requests */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Urlaubsanträge</CardTitle>
                  <CardDescription>
                    {userRole === "admin" ? "Alle Urlaubsanträge verwalten" : "Urlaubsanträge des Teams"}
                  </CardDescription>
                </div>
                {userRole === "admin" && (
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Mitarbeiter auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                      {allEmployees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id.toString()}>
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
                {getFilteredRequests().length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Keine Urlaubsanträge vorhanden
                  </p>
                ) : (
                  getFilteredRequests().map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-4">
                        <User className="h-8 w-8 text-muted-foreground p-1 bg-muted rounded-full" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{formatEmployeeName(allEmployees.find(emp => emp.id === request.employeeId)!)}</p>
                            {getStatusBadge(request.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {format(new Date(request.startDate), "dd.MM.yyyy", { locale: de })} - {format(new Date(request.endDate), "dd.MM.yyyy", { locale: de })}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {request.days} Tag{request.days !== 1 ? 'e' : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            {request.reason}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {userRole === "admin" && request.status === 'pending' && (
                          <>
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
                          </>
                        )}
                        {canDeleteRequest(request) && request.employeeId === currentUserId && (
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
                        {request.status === 'pending' && request.employeeId === currentUserId && userRole === "employee" && (
                          <Badge variant="outline">Bearbeitbar</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
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
            <div className="grid gap-4 md:grid-cols-4">
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
                    req.status === 'pending' && req.employeeId === currentUserId
                  ).length}
                </p>
              </div>
            </div>
            
            {/* Additional stats for all users */}
            <div className="mt-4 pt-4 border-t">
              <div className="grid gap-4 md:grid-cols-2">
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
            </div>
          </CardContent>
        </Card>

        {/* Overtime Section */}
        <Card>
          <CardHeader>
            <CardTitle>Überstunden & Zeitausgleich</CardTitle>
            <CardDescription>
              Übersicht Ihrer Überstunden aus der Zeiterfassung
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const overtimeStats = calculateOvertimeStats(currentUserId);
              return (
                <div className="space-y-6">
                  {/* Overtime Statistics */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Gesamte Überstunden</p>
                      <p className="text-2xl font-bold">{overtimeStats.totalOvertimeHours.toFixed(1)}h</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Verfügbare freie Tage</p>
                      <p className={`text-2xl font-bold ${
                        overtimeStats.availableOvertimeDays > 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {overtimeStats.availableOvertimeDays}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Verwendete Überstunden-Tage</p>
                      <p className="text-2xl font-bold text-blue-600">{overtimeStats.usedOvertimeDays}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Verbleibende Stunden</p>
                      <p className="text-2xl font-bold text-orange-600">{overtimeStats.remainingOvertimeHours.toFixed(1)}h</p>
                    </div>
                  </div>

                  {/* Request Overtime Compensation */}
                  {overtimeStats.availableOvertimeDays > 0 && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-orange-800">Überstundenausgleich verfügbar</h4>
                          <p className="text-sm text-orange-700">
                            Sie können {overtimeStats.availableOvertimeDays} freie Tag(e) durch Überstundenausgleich beantragen.
                            (1 Tag = {getEmployeeWorkHours(currentUserId)} Überstunden)
                          </p>
                        </div>
                        <Button 
                          onClick={() => setShowOvertimeDialog(true)}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          <Timer className="mr-2 h-4 w-4" />
                          Überstunden einlösen
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Information about overtime calculation */}
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      ℹ️ Überstunden werden automatisch aus Ihrer Zeiterfassung berechnet. 
                      Arbeitszeiten über {getEmployeeWorkHours(currentUserId)} Stunden pro Tag werden als Überstunden gezählt.
                    </p>
                  </div>
                </div>
              );
            })()}
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
              <div className="grid grid-cols-2 gap-4">
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
                    {userRole === "employee" && (
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
                    {userRole === "employee" && calculateDays(requestForm.startDate, requestForm.endDate) > getMaxRequestableDays() && (
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
                disabled={userRole === "employee" && requestForm.startDate && requestForm.endDate && calculateDays(requestForm.startDate, requestForm.endDate) > getMaxRequestableDays()}
              >
                <Plus className="mr-2 h-4 w-4" />
                Antrag einreichen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin Approval Dialog */}
        {userRole === "admin" && (
          <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Urlaubsantrag bearbeiten</DialogTitle>
                <DialogDescription>
                  {selectedRequest && (
                    <>Antrag von {selectedRequest.employeeName} vom {format(new Date(selectedRequest.requestDate), "dd.MM.yyyy", { locale: de })}</>
                  )}
                </DialogDescription>
              </DialogHeader>
              {selectedRequest && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Zeitraum:</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedRequest.startDate), "dd.MM.yyyy", { locale: de })} - {format(new Date(selectedRequest.endDate), "dd.MM.yyyy", { locale: de })} ({selectedRequest.days} Tage)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Grund:</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.reason}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Administratornotiz (optional)</Label>
                    <Textarea placeholder="Notiz zur Genehmigung oder Ablehnung..." />
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

        {/* Overtime Request Dialog */}
        <Dialog open={showOvertimeDialog} onOpenChange={setShowOvertimeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Überstundenausgleich beantragen</DialogTitle>
              <DialogDescription>
                Tauschen Sie Ihre Überstunden gegen freie Tage (1 Tag = {getEmployeeWorkHours(currentUserId)} Stunden)
              </DialogDescription>
            </DialogHeader>
            {(() => {
              const overtimeStats = calculateOvertimeStats(currentUserId);
              return (
                <div className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Verfügbare Überstunden-Tage: <span className="font-semibold text-orange-600">{overtimeStats.availableOvertimeDays}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Verbleibende Stunden: <span className="font-semibold">{overtimeStats.remainingOvertimeHours.toFixed(1)}h</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Startdatum</Label>
                      <Input 
                        type="date" 
                        value={overtimeForm.startDate || ""}
                        onChange={(e) => setOvertimeForm(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Enddatum</Label>
                      <Input 
                        type="date" 
                        value={overtimeForm.endDate || ""}
                        onChange={(e) => setOvertimeForm(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  {overtimeForm.startDate && overtimeForm.endDate && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800">
                        Gewählter Zeitraum: <span className="font-semibold">
                          {format(new Date(overtimeForm.startDate), "dd.MM.yyyy", { locale: de })} - 
                          {format(new Date(overtimeForm.endDate), "dd.MM.yyyy", { locale: de })}
                        </span>
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Anzahl freie Tage</Label>
                    <Input 
                      type="number" 
                      min="1"
                      max={overtimeStats.availableOvertimeDays}
                      value={overtimeForm.requestedDays}
                      onChange={(e) => setOvertimeForm(prev => ({ ...prev, requestedDays: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Grund für Zeitausgleich</Label>
                    <Textarea 
                      placeholder="z.B. Erholung nach Überstunden, persönliche Termine..."
                      value={overtimeForm.reason}
                      onChange={(e) => setOvertimeForm(prev => ({ ...prev, reason: e.target.value }))}
                    />
                  </div>
                  {overtimeForm.requestedDays > overtimeStats.availableOvertimeDays && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        ⚠️ Sie haben nicht genügend Überstunden für {overtimeForm.requestedDays} freie Tage.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOvertimeDialog(false)}>Abbrechen</Button>
              <Button 
                onClick={handleOvertimeRequest}
                disabled={overtimeForm.requestedDays > calculateOvertimeStats(currentUserId).availableOvertimeDays || !overtimeForm.startDate || !overtimeForm.endDate}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Timer className="mr-2 h-4 w-4" />
                Überstunden einlösen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete/Revoke Vacation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Urlaubsantrag stornieren</DialogTitle>
              <DialogDescription>
                {selectedRequest && (
                  <>Möchten Sie Ihren Urlaubsantrag vom {format(new Date(selectedRequest.requestDate), "dd.MM.yyyy", { locale: de })} wirklich stornieren?</>
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
                    <p><span className="font-medium">Zeitraum:</span> {format(new Date(selectedRequest.startDate), "dd.MM.yyyy", { locale: de })} - {format(new Date(selectedRequest.endDate), "dd.MM.yyyy", { locale: de })}</p>
                    <p><span className="font-medium">Tage:</span> {selectedRequest.days} Tag{selectedRequest.days !== 1 ? 'e' : ''}</p>
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
      </div>
    </DashboardLayout>
  );
};

export default Vacation;