import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, User, CalendarDays, Gift, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useVacationEntitlements, type VacationEntitlement } from "@/hooks/use-vacation-entitlements";
import { useCompanyEmployees } from "@/hooks/use-company-data";
import { useAuthContext } from "@/contexts/AuthContext";

interface VacationEntitlementsManagerProps {
  className?: string;
}

const VacationEntitlementsManager = ({ className }: VacationEntitlementsManagerProps) => {
  const { toast } = useToast();
  const { isAdmin } = useAuthContext();
  const { data: companyEmployees = [], isLoading: employeesLoading } = useCompanyEmployees();
  const {
    entitlements,
    loading: entitlementsLoading,
    createEntitlement,
    updateEntitlement,
    deleteEntitlement,
    getEmployeeEntitlement,
    getTotalVacationDays
  } = useVacationEntitlements();

  const [showEntitlementDialog, setShowEntitlementDialog] = useState(false);
  const [editingEntitlement, setEditingEntitlement] = useState<VacationEntitlement | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const [entitlementForm, setEntitlementForm] = useState({
    employeeId: "",
    year: new Date().getFullYear(),
    totalDays: 30,
    carriedOverDays: 0,
    bonusDays: 0,
    notes: ""
  });

  // Don't render for non-admins
  if (!isAdmin) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Format employee name
  const formatEmployeeName = (employee: any): string => {
    if (!employee) return 'Unknown';
    const fullName = `${employee.first_name} ${employee.last_name}`;
    const nameParts = fullName.split(' ');
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      const lastNameInitial = nameParts[nameParts.length - 1].charAt(0);
      return `${firstName}. ${lastNameInitial}`;
    }
    return fullName;
  };

  // Get filtered entitlements
  const getFilteredEntitlements = () => {
    let filtered = entitlements;

    if (selectedEmployee && selectedEmployee !== "all") {
      filtered = filtered.filter(ent => ent.employee_id === selectedEmployee);
    }

    if (selectedYear && selectedYear !== "all") {
      filtered = filtered.filter(ent => ent.year === parseInt(selectedYear));
    }

    return filtered;
  };

  // Get employees without entitlements for current year
  const getEmployeesWithoutEntitlements = () => {
    return companyEmployees.filter(employee => {
      const entitlement = getEmployeeEntitlement(employee.id, currentYear);
      return !entitlement;
    });
  };

  // Handle create new entitlement
  const handleCreateEntitlement = () => {
    setEntitlementForm({
      employeeId: "",
      year: currentYear,
      totalDays: 30,
      carriedOverDays: 0,
      bonusDays: 0,
      notes: ""
    });
    setEditingEntitlement(null);
    setShowEntitlementDialog(true);
  };

  // Handle edit entitlement
  const handleEditEntitlement = (entitlement: VacationEntitlement) => {
    setEntitlementForm({
      employeeId: entitlement.employee_id,
      year: entitlement.year,
      totalDays: entitlement.total_days,
      carriedOverDays: entitlement.carried_over_days,
      bonusDays: entitlement.bonus_days,
      notes: entitlement.notes || ""
    });
    setEditingEntitlement(entitlement);
    setShowEntitlementDialog(true);
  };

  // Handle save entitlement
  const handleSaveEntitlement = async () => {
    if (!entitlementForm.employeeId) {
      toast({
        title: "Mitarbeiter erforderlich",
        description: "Bitte wählen Sie einen Mitarbeiter aus.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingEntitlement) {
        await updateEntitlement(editingEntitlement.id, {
          total_days: entitlementForm.totalDays,
          carried_over_days: entitlementForm.carriedOverDays,
          bonus_days: entitlementForm.bonusDays,
          notes: entitlementForm.notes || null
        });
      } else {
        await createEntitlement({
          employee_id: entitlementForm.employeeId,
          year: entitlementForm.year,
          total_days: entitlementForm.totalDays,
          carried_over_days: entitlementForm.carriedOverDays,
          bonus_days: entitlementForm.bonusDays,
          notes: entitlementForm.notes || null
        });
      }
      setShowEntitlementDialog(false);
    } catch (error) {
      console.error('Error saving entitlement:', error);
    }
  };

  // Handle delete entitlement
  const handleDeleteEntitlement = async (entitlement: VacationEntitlement) => {
    if (window.confirm('Sind Sie sicher, dass Sie diesen Urlaubsanspruch löschen möchten?')) {
      try {
        await deleteEntitlement(entitlement.id);
      } catch (error) {
        console.error('Error deleting entitlement:', error);
      }
    }
  };

  const isLoading = entitlementsLoading || employeesLoading;

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Urlaubsansprüche verwalten</CardTitle>
              <CardDescription>
                Konfigurieren Sie individuelle Urlaubstage für Ihre Mitarbeiter
              </CardDescription>
            </div>
            <Button onClick={handleCreateEntitlement}>
              <Plus className="mr-2 h-4 w-4" />
              Anspruch hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Controls */}
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <div className="space-y-2">
              <Label>Mitarbeiter</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle Mitarbeiter" />
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
            </div>
            <div className="space-y-2">
              <Label>Jahr</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle Jahre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Jahre</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Employees without entitlements warning */}
          {getEmployeesWithoutEntitlements().length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="h-4 w-4 text-yellow-600" />
                <p className="text-sm font-medium text-yellow-800">
                  Mitarbeiter ohne Urlaubsanspruch ({currentYear})
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {getEmployeesWithoutEntitlements().map((employee) => (
                  <Badge key={employee.id} variant="outline" className="text-yellow-700 border-yellow-300">
                    {formatEmployeeName(employee)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Entitlements List */}
          <div className="space-y-4">
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">
                Urlaubsansprüche werden geladen...
              </p>
            ) : getFilteredEntitlements().length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Keine Urlaubsansprüche gefunden
              </p>
            ) : (
              getFilteredEntitlements().map((entitlement) => {
                const employee = companyEmployees.find(emp => emp.id === entitlement.employee_id);
                const totalVacationDays = entitlement.total_days + entitlement.carried_over_days + entitlement.bonus_days;
                
                return (
                  <div key={entitlement.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <User className="h-8 w-8 text-muted-foreground p-1 bg-muted rounded-full" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{employee ? formatEmployeeName(employee) : 'Unknown Employee'}</p>
                          <Badge variant="outline">{entitlement.year}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            <span>{entitlement.total_days} Grundtage</span>
                          </div>
                          {entitlement.carried_over_days > 0 && (
                            <div className="flex items-center gap-1">
                              <ArrowRight className="h-3 w-3" />
                              <span>+{entitlement.carried_over_days} übertragen</span>
                            </div>
                          )}
                          {entitlement.bonus_days > 0 && (
                            <div className="flex items-center gap-1">
                              <Gift className="h-3 w-3" />
                              <span>+{entitlement.bonus_days} Bonus</span>
                            </div>
                          )}
                          <div className="font-medium text-primary">
                            = {totalVacationDays} Tage gesamt
                          </div>
                        </div>
                        {entitlement.notes && (
                          <p className="text-xs text-muted-foreground">{entitlement.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditEntitlement(entitlement)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteEntitlement(entitlement)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Entitlement Dialog */}
      <Dialog open={showEntitlementDialog} onOpenChange={setShowEntitlementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEntitlement ? 'Urlaubsanspruch bearbeiten' : 'Urlaubsanspruch hinzufügen'}
            </DialogTitle>
            <DialogDescription>
              Konfigurieren Sie die Urlaubstage für einen Mitarbeiter
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mitarbeiter</Label>
              <Select 
                value={entitlementForm.employeeId} 
                onValueChange={(value) => setEntitlementForm(prev => ({ ...prev, employeeId: value }))}
                disabled={!!editingEntitlement}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mitarbeiter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {companyEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name} ({employee.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jahr</Label>
              <Select 
                value={entitlementForm.year.toString()} 
                onValueChange={(value) => setEntitlementForm(prev => ({ ...prev, year: parseInt(value) }))}
                disabled={!!editingEntitlement}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Grundtage</Label>
                <Input
                  type="number"
                  min="0"
                  max="365"
                  value={entitlementForm.totalDays}
                  onChange={(e) => setEntitlementForm(prev => ({ ...prev, totalDays: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Übertragene Tage</Label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={entitlementForm.carriedOverDays}
                  onChange={(e) => setEntitlementForm(prev => ({ ...prev, carriedOverDays: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Bonus Tage</Label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={entitlementForm.bonusDays}
                  onChange={(e) => setEntitlementForm(prev => ({ ...prev, bonusDays: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Gesamt verfügbare Urlaubstage: <span className="font-semibold text-primary">
                  {entitlementForm.totalDays + entitlementForm.carriedOverDays + entitlementForm.bonusDays} Tage
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Notizen (optional)</Label>
              <Textarea
                placeholder="Zusätzliche Notizen zum Urlaubsanspruch..."
                value={entitlementForm.notes}
                onChange={(e) => setEntitlementForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEntitlementDialog(false)}>Abbrechen</Button>
            <Button onClick={handleSaveEntitlement}>
              <CalendarDays className="mr-2 h-4 w-4" />
              {editingEntitlement ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VacationEntitlementsManager;