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
import { useVacation, type VacationRequest, type Employee } from "@/hooks/use-vacation";
import { useCompanyEmployees } from "@/hooks/use-company-data";
import { useAuthContext } from "@/contexts/AuthContext";
import VacationEntitlementsManager from "@/components/VacationEntitlementsManager";

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
  const [selectedRequest, setSelectedRequest] = useState<VacationRequest | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [adminNote, setAdminNote] = useState("");
  
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
    getEmployeeVacationDays
  } = useVacation();

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Urlaubsplanung</h1>
            <p className="text-muted-foreground">
              {isAdmin 
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
            {!canRequestVacation() && !isAdmin && (
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

          {/* Main Content */}
          <div className="md:col-span-2">
            <Tabs defaultValue="requests" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="requests">Urlaubsanträge</TabsTrigger>
                {isAdmin && <TabsTrigger value="entitlements">Ansprüche verwalten</TabsTrigger>}
              </TabsList>
              
              <TabsContent value="requests" className="space-y-4">
                {/* Vacation Requests Content */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Urlaubsanträge</CardTitle>
                        <CardDescription>
                          {isAdmin ? "Alle Urlaubsanträge verwalten" : "Urlaubsanträge des Teams"}
                        </CardDescription>
                      </div>
                      {isAdmin && (
                        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                          <SelectTrigger className="w-48">
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
                      <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                          <User className="h-8 w-8 text-muted-foreground p-1 bg-muted rounded-full" />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{requestEmployee ? formatEmployeeName(requestEmployee) : 'Unknown Employee'}</p>
                              {getStatusBadge(request.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {format(new Date(request.start_date), "dd.MM.yyyy", { locale: de })} - {format(new Date(request.end_date), "dd.MM.yyyy", { locale: de })}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {request.days_requested} Tag{request.days_requested !== 1 ? 'e' : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              {request.reason}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
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
                  req.status === 'pending' && req.employee_id === currentEmployeeId
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
    </div>
    </DashboardLayout>
  );
};

export default Vacation;