import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Clock, User, Save, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCompanyEmployees } from "@/hooks/use-company-data";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

interface WorkHourSetting {
  employeeId: string;
  workHoursPerDay: number;
}

const AdminSettings = () => {
  const { toast } = useToast();
  const { company, isAdmin, isManager } = useAuthContext();
  const { data: employees = [], isLoading: employeesLoading } = useCompanyEmployees();
  
  // Work hour settings - stored in state
  const [workHourSettings, setWorkHourSettings] = useState<WorkHourSetting[]>([]);
  const [originalSettings, setOriginalSettings] = useState<WorkHourSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Check permissions - both admins and managers can access
  const canManageSettings = isAdmin || isManager;

  // Fetch work hour settings from company settings
  useEffect(() => {
    const fetchWorkHourSettings = async () => {
      if (!company?.id || !canManageSettings) return;
      
      setIsLoading(true);
      try {
        // Get company settings which includes employee-specific work hours
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('settings')
          .eq('id', company.id)
          .single();
        
        if (companyError) throw companyError;
        
        // Extract work hour settings from company settings with proper type checking
        const companySettings = (typeof companyData?.settings === 'object' && companyData?.settings !== null) ? companyData.settings : {};
        const employeeWorkHours = (typeof companySettings === 'object' && companySettings !== null && 'employee_work_hours' in companySettings && typeof companySettings.employee_work_hours === 'object' && companySettings.employee_work_hours !== null) ? companySettings.employee_work_hours : {};
        
        // Initialize settings for each employee
        const initialSettings: WorkHourSetting[] = employees.map(employee => ({
          employeeId: employee.id,
          workHoursPerDay: employeeWorkHours && typeof employeeWorkHours === 'object' && employee.id in employeeWorkHours ? employeeWorkHours[employee.id] as number : getDefaultWorkHours(employee.position)
        }));
        
        setWorkHourSettings(initialSettings);
        setOriginalSettings([...initialSettings]);
      } catch (error) {
        console.error('Error fetching work hour settings:', error);
        toast({
          title: "Fehler",
          description: "Fehler beim Laden der Arbeitszeiteinstellungen.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWorkHourSettings();
  }, [company?.id, employees, canManageSettings]);

  // Get default work hours based on position
  const getDefaultWorkHours = (position: string | null): number => {
    if (!position) return 8;
    
    switch (position) {
      case "Kita - Leitung": return 8.5; // Management works slightly more
      case "FSJ": return 6; // FSJ (volunteers) work fewer hours
      case "Erzieher":
      case "Erzieherin":
      default:
        return 8; // Standard work hours
    }
  };

  // Update work hours for an employee
  const updateWorkHours = (employeeId: string, newHours: number) => {
    setWorkHourSettings(prev => 
      prev.map(setting => 
        setting.employeeId === employeeId 
          ? { ...setting, workHoursPerDay: newHours }
          : setting
      )
    );
  };

  // Save settings to database
  const saveSettings = async () => {
    if (!company?.id || !canManageSettings) return;
    
    setIsSaving(true);
    try {
      // Get current company settings
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', company.id)
        .single();
      
      if (companyError) throw companyError;
      
      // Update company settings with employee-specific work hours
      const companySettings = (typeof companyData?.settings === 'object' && companyData?.settings !== null) ? companyData.settings : {};
      const employeeWorkHours = (typeof companySettings === 'object' && companySettings !== null && 'employee_work_hours' in companySettings && typeof companySettings.employee_work_hours === 'object' && companySettings.employee_work_hours !== null) ? companySettings.employee_work_hours : {};
      
      // Update work hours for each employee
      workHourSettings.forEach(setting => {
        if (typeof employeeWorkHours === 'object' && employeeWorkHours !== null) {
          employeeWorkHours[setting.employeeId] = setting.workHoursPerDay;
        }
      });
      
      const updatedSettings = {
        ...companySettings,
        employee_work_hours: employeeWorkHours
      };
      
      const { error: updateError } = await supabase
        .from('companies')
        .update({ settings: updatedSettings })
        .eq('id', company.id);
      
      if (updateError) throw updateError;
      
      setOriginalSettings([...workHourSettings]);
      toast({
        title: "Einstellungen gespeichert",
        description: "Die Arbeitszeiteinstellungen wurden erfolgreich gespeichert."
      });
    } catch (error) {
      console.error('Error saving work hour settings:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Speichern der Arbeitszeiteinstellungen.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default values
  const resetToDefaults = () => {
    const defaultSettings = employees.map(employee => ({
      employeeId: employee.id,
      workHoursPerDay: getDefaultWorkHours(employee.position)
    }));
    setWorkHourSettings(defaultSettings);
  };

  // Check if settings have been modified
  const hasUnsavedChanges = JSON.stringify(workHourSettings) !== JSON.stringify(originalSettings);

  // Format employee name according to specification
  const formatEmployeeName = (employee: Tables<'employees'>): string => {
    if (!employee.first_name && !employee.last_name) return "Unbekannter Mitarbeiter";
    
    const firstName = employee.first_name || "";
    const lastName = employee.last_name || "";
    
    if (firstName && lastName) {
      return `${firstName} ${lastName.charAt(0)}.`;
    }
    
    return firstName || lastName;
  };

  // Show loading state
  if (isLoading || employeesLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Einstellungen</h1>
            <p className="text-muted-foreground">Lade Einstellungen...</p>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show access denied if user is not admin or manager
  if (!canManageSettings) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Einstellungen</h1>
            <p className="text-muted-foreground">Zugriff verweigert</p>
          </div>
          <Card>
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Sie haben keine Berechtigung, auf diese Einstellungen zuzugreifen.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Einstellungen</h1>
            <p className="text-muted-foreground">
              {isAdmin 
                ? "Systemkonfiguration und Arbeitszeiteinstellungen" 
                : "Team Arbeitszeiteinstellungen"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={resetToDefaults}
              disabled={isSaving}
            >
              Zurücksetzen
            </Button>
            <Button 
              onClick={saveSettings}
              disabled={isSaving || !hasUnsavedChanges}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Speichern..." : "Speichern"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="workhours" className="space-y-4">
          <TabsList>
            <TabsTrigger value="workhours">Arbeitszeiten</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="notifications">Benachrichtigungen</TabsTrigger>
          </TabsList>

          <TabsContent value="workhours">
            <Card>
              <CardHeader>
                <CardTitle>Arbeitszeit-Konfiguration</CardTitle>
                <CardDescription>
                  Konfigurieren Sie die täglichen Arbeitsstunden für jeden Mitarbeiter. 
                  Diese Einstellungen beeinflussen die Überstunden-Berechnung.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Work Hours Settings */}
                <div className="space-y-4">
                  {employees.map((employee) => {
                    const setting = workHourSettings.find(s => s.employeeId === employee.id);
                    if (!setting) return null;
                    
                    return (
                      <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <User className="h-8 w-8 text-muted-foreground p-1 bg-muted rounded-full" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{formatEmployeeName(employee)}</p>
                              <Badge variant="outline">{employee.position || "Keine Position"}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{employee.department || "Keine Abteilung"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-sm font-medium">Arbeitsstunden/Tag:</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              max="12"
                              step="0.5"
                              value={setting.workHoursPerDay}
                              onChange={(e) => updateWorkHours(employee.id, parseFloat(e.target.value) || 8)}
                              className="w-20 text-center"
                              disabled={isSaving}
                            />
                            <span className="text-sm text-muted-foreground">h</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary Information */}
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Informationen zur Überstunden-Berechnung</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Überstunden werden automatisch berechnet, wenn die tägliche Arbeitszeit überschritten wird</p>
                    <p>• Für einen freien Tag benötigt jeder Mitarbeiter so viele Überstunden wie seine tägliche Arbeitszeit</p>
                    <p>• Beispiel: FSJ-Mitarbeiter (6h/Tag) benötigt 6 Überstunden für einen freien Tag</p>
                    <p>• Vollzeit-Mitarbeiter (8h/Tag) benötigt 8 Überstunden für einen freien Tag</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>Systemeinstellungen</CardTitle>
                <CardDescription>Allgemeine Systemkonfiguration</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <SettingsIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Weitere Systemeinstellungen werden hier hinzugefügt...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Benachrichtigungseinstellungen</CardTitle>
                <CardDescription>Konfigurieren Sie Benachrichtigungen</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <SettingsIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Benachrichtigungseinstellungen werden hier konfiguriert...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;