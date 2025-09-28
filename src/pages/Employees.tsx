import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, User, Mail, Phone, Calendar, Download, Edit, Trash2, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCompanyEmployees } from "@/hooks/use-company-data";
import { useEmployeeManagement, CreateEmployeeData } from "@/hooks/use-employee-management";
import { getFullEmployeeName } from "@/lib/employee-utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const Employees = () => {
  const { toast } = useToast();
  const { company, isAdmin, isManager } = useAuthContext();
  const { data: employees = [], isLoading, error, refetch } = useCompanyEmployees();
  const { createEmployee, updateEmployee, deactivateEmployee, reactivateEmployee } = useEmployeeManagement();
  
  // Check for selected employee from localStorage (from Dashboard)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if there's a selected employee ID in localStorage
    const storedEmployeeId = localStorage.getItem('selectedEmployeeId');
    if (storedEmployeeId) {
      setSelectedEmployeeId(storedEmployeeId);
      // Remove it from localStorage so it doesn't persist
      localStorage.removeItem('selectedEmployeeId');
      
      // Scroll to the selected employee after a short delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(`employee-${storedEmployeeId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add a temporary highlight effect
          element.classList.add('bg-yellow-100');
          setTimeout(() => {
            element.classList.remove('bg-yellow-100');
          }, 2000);
        }
      }, 100);
    }
  }, []);
  
  // Form state for adding new employee
  const [newEmployeeData, setNewEmployeeData] = useState<CreateEmployeeData>({
    first_name: '',
    last_name: '',
    email: '',
    position: '',
    department: '',
    hire_date: '',
    hourly_rate: undefined,
    employee_id: '',
  });
  
  // State for editing employee
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check permissions
  const canManageEmployees = isAdmin || isManager;

  // Calculate statistics
  const activeEmployees = employees.filter(emp => emp.is_active);
  const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))] as string[];
  const currentMonth = new Date();
  const newEmployeesThisMonth = employees.filter(emp => {
    if (!emp.hire_date) return false;
    const hireDate = new Date(emp.hire_date);
    return hireDate.getMonth() === currentMonth.getMonth() && 
           hireDate.getFullYear() === currentMonth.getFullYear();
  });

  const handleAddEmployee = async () => {
    if (!canManageEmployees) {
      toast({
        title: "Keine Berechtigung",
        description: "Sie haben keine Berechtigung, um Mitarbeiter hinzuzufügen.",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!newEmployeeData.first_name || !newEmployeeData.last_name || !newEmployeeData.email) {
      toast({
        title: "Fehlerhafte Eingabe",
        description: "Bitte füllen Sie alle Pflichtfelder aus.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createEmployee.mutateAsync(newEmployeeData);
      
      toast({
        title: "Mitarbeiter hinzugefügt",
        description: `${newEmployeeData.first_name} ${newEmployeeData.last_name} wurde erfolgreich hinzugefügt.`,
      });
      
      // Reset form
      setNewEmployeeData({
        first_name: '',
        last_name: '',
        email: '',
        position: '',
        department: '',
        hire_date: '',
        hourly_rate: undefined,
        employee_id: '',
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Fehler beim Hinzufügen des Mitarbeiters.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateEmployee = async (employeeId: string, employeeName: string) => {
    if (!canManageEmployees) {
      toast({
        title: "Keine Berechtigung",
        description: "Sie haben keine Berechtigung, um Mitarbeiter zu deaktivieren.",
        variant: "destructive",
      });
      return;
    }

    try {
      await deactivateEmployee.mutateAsync(employeeId);
      toast({
        title: "Mitarbeiter deaktiviert",
        description: `${employeeName} wurde deaktiviert.`,
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Fehler beim Deaktivieren des Mitarbeiters.",
        variant: "destructive",
      });
    }
  };

  const handleReactivateEmployee = async (employeeId: string, employeeName: string) => {
    if (!canManageEmployees) {
      toast({
        title: "Keine Berechtigung",
        description: "Sie haben keine Berechtigung, um Mitarbeiter zu reaktivieren.",
        variant: "destructive",
      });
      return;
    }

    try {
      await reactivateEmployee.mutateAsync(employeeId);
      toast({
        title: "Mitarbeiter reaktiviert",
        description: `${employeeName} wurde reaktiviert.`,
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Fehler beim Reaktivieren des Mitarbeiters.",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    if (!employees.length) {
      toast({
        title: "Keine Daten",
        description: "Keine Mitarbeiterdaten zum Exportieren verfügbar.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = ['Name', 'Email', 'Position', 'Abteilung', 'Einstellungsdatum', 'Status'];
    const csvContent = [
      headers.join(';'),
      ...employees.map(emp => [
        getFullEmployeeName(emp),
        emp.email,
        emp.position || '',
        emp.department || '',
        emp.hire_date ? format(new Date(emp.hire_date), 'dd.MM.yyyy', { locale: de }) : '',
        emp.is_active ? 'Aktiv' : 'Inaktiv'
      ].join(';'))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `mitarbeiter_${company?.name || 'company'}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export erfolgreich",
      description: "Die Mitarbeiterdaten wurden heruntergeladen.",
    });
  };

  // Show loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Mitarbeiter</h1>
              <p className="text-muted-foreground">
                Verwalten Sie Ihr Team und Mitarbeiterinformationen
              </p>
            </div>
            <Skeleton className="h-10 w-20" />
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Mitarbeiter</h1>
              <p className="text-muted-foreground">
                Verwalten Sie Ihr Team und Mitarbeiterinformationen
              </p>
            </div>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-destructive">Fehler beim Laden der Mitarbeiterdaten</p>
                <Button onClick={() => refetch()} variant="outline">
                  Erneut versuchen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Mitarbeiter</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Verwalten Sie Ihr Team und Mitarbeiterinformationen
            </p>
          </div>
          <Button onClick={handleExport} disabled={!employees.length} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Employee Management */}
        <Tabs defaultValue="list" className="space-y-4 w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2 p-1 bg-muted rounded-lg">
            <TabsTrigger value="list" className="whitespace-nowrap">Mitarbeiterliste</TabsTrigger>
            {canManageEmployees && (
              <TabsTrigger value="add" className="whitespace-nowrap">Mitarbeiter hinzufügen</TabsTrigger>
            )}
            <TabsTrigger value="statistics" className="whitespace-nowrap">Statistiken</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-2">
            <Card>
              <CardHeader>
                <CardTitle>Alle Mitarbeiter</CardTitle>
                <CardDescription>
                  Übersicht aller registrierten Mitarbeiter in {company?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {employees.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Noch keine Mitarbeiter hinzugefügt
                      </p>
                      {canManageEmployees && (
                        <p className="text-sm text-muted-foreground">
                          Verwenden Sie den Tab "Mitarbeiter hinzufügen", um neue Teammitglieder hinzuzufügen.
                        </p>
                      )}
                    </div>
                  ) : (
                    employees.map((employee) => (
                      <div 
                        key={employee.id} 
                        id={`employee-${employee.id}`}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg hover:bg-muted border gap-4 overflow-hidden ${
                          selectedEmployeeId === employee.id ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <User className="h-8 w-8 text-muted-foreground p-1 bg-muted rounded-full flex-shrink-0" />
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold truncate">{getFullEmployeeName(employee)}</p>
                              {employee.auth_user_id && (
                                <Badge variant="secondary" className="text-xs flex-shrink-0">
                                  Verknüpft
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              <div className="flex items-center gap-1 min-w-0">
                                <Mail className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{employee.email}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-shrink-0">
                          <div className="space-y-1 min-w-0">
                            <p className="font-semibold truncate">{employee.position || 'Keine Position'}</p>
                            <p className="text-sm text-muted-foreground truncate">{employee.department || 'Keine Abteilung'}</p>
                            {employee.hire_date && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span className="truncate">Seit {format(new Date(employee.hire_date), 'dd.MM.yyyy', { locale: de })}</span>
                              </div>
                            )}
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium truncate ${
                              employee.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {employee.is_active ? 'Aktiv' : 'Inaktiv'}
                            </span>
                          </div>
                          {canManageEmployees && (
                            <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
                              {employee.is_active ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeactivateEmployee(employee.id, getFullEmployeeName(employee))}
                                  className="text-red-600 hover:text-red-700 flex-shrink-0"
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReactivateEmployee(employee.id, getFullEmployeeName(employee))}
                                  className="text-green-600 hover:text-green-700 flex-shrink-0"
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {canManageEmployees && (
            <TabsContent value="add" className="mt-2">
              <Card>
                <CardHeader>
                  <CardTitle>Neuen Mitarbeiter hinzufügen</CardTitle>
                  <CardDescription>
                    Fügen Sie einen neuen Mitarbeiter zum System hinzu. Nach der Registrierung wird automatisch versucht, das Benutzerkonto mit diesem Mitarbeitereintrag zu verknüpfen.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Vorname *</Label>
                      <Input
                        id="firstName"
                        placeholder="Max"
                        value={newEmployeeData.first_name}
                        onChange={(e) => setNewEmployeeData(prev => ({ ...prev, first_name: e.target.value }))}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nachname *</Label>
                      <Input
                        id="lastName"
                        placeholder="Mustermann"
                        value={newEmployeeData.last_name}
                        onChange={(e) => setNewEmployeeData(prev => ({ ...prev, last_name: e.target.value }))}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail-Adresse *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="max.mustermann@company.com"
                      value={newEmployeeData.email}
                      onChange={(e) => setNewEmployeeData(prev => ({ ...prev, email: e.target.value }))}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employeeId">Mitarbeiter-ID</Label>
                      <Input
                        id="employeeId"
                        placeholder="EMP001"
                        value={newEmployeeData.employee_id}
                        onChange={(e) => setNewEmployeeData(prev => ({ ...prev, employee_id: e.target.value }))}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        placeholder="Softwareentwickler"
                        value={newEmployeeData.position}
                        onChange={(e) => setNewEmployeeData(prev => ({ ...prev, position: e.target.value }))}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">Abteilung</Label>
                      <Input
                        id="department"
                        placeholder="IT"
                        value={newEmployeeData.department}
                        onChange={(e) => setNewEmployeeData(prev => ({ ...prev, department: e.target.value }))}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hireDate">Einstellungsdatum</Label>
                      <Input
                        id="hireDate"
                        type="date"
                        value={newEmployeeData.hire_date}
                        onChange={(e) => setNewEmployeeData(prev => ({ ...prev, hire_date: e.target.value }))}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Stundensatz (€)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      placeholder="25.00"
                      value={newEmployeeData.hourly_rate || ''}
                      onChange={(e) => setNewEmployeeData(prev => ({ 
                        ...prev, 
                        hourly_rate: e.target.value ? parseFloat(e.target.value) : undefined 
                      }))}
                      disabled={isSubmitting}
                    />
                  </div>
                  <Button onClick={handleAddEmployee} disabled={isSubmitting} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    {isSubmitting ? 'Wird hinzugefügt...' : 'Mitarbeiter hinzufügen'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="statistics" className="mt-2">
            <Card>
              <CardHeader>
                <CardTitle>Team-Statistiken</CardTitle>
                <CardDescription>
                  Übersicht über Ihr Team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Aktive Mitarbeiter</p>
                    <p className="text-2xl font-bold">{activeEmployees.length}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Abteilungen</p>
                    <p className="text-2xl font-bold">{departments.length}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Neue Mitarbeiter (Monat)</p>
                    <p className="text-2xl font-bold text-primary">{newEmployeesThisMonth.length}</p>
                  </div>
                </div>
                
                {departments.length > 0 && (
                  <>
                    <hr className="my-4" />
                    <div className="space-y-4">
                      <h4 className="font-medium">Abteilungen</h4>
                      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                        {departments.map((dept) => {
                          const deptEmployees = activeEmployees.filter(emp => emp.department === dept);
                          return (
                            <div key={dept} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                              <span className="font-medium">{dept}</span>
                              <Badge variant="secondary">{deptEmployees.length}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Employees;