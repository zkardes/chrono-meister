import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Clock, User, Save, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Employee {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
}

interface WorkHourSetting {
  employeeId: number;
  employeeName: string;
  workHoursPerDay: number;
  position: string;
  department: string;
}

const Settings = () => {
  const { toast } = useToast();
  const userRole = localStorage.getItem("userRole") || "employee";
  
  // Sample employees data - in real app, this would come from API
  const [employees] = useState<Employee[]>([
    { id: 1, name: "Max Mustermann", email: "max.mustermann@company.com", position: "Erzieher", department: "Kita" },
    { id: 2, name: "Anna Schmidt", email: "anna.schmidt@company.com", position: "Erzieherin", department: "Kita" },
    { id: 3, name: "Thomas Weber", email: "thomas.weber@company.com", position: "Kita - Leitung", department: "Management" },
    { id: 4, name: "Lisa Müller", email: "lisa.mueller@company.com", position: "FSJ", department: "Ausbildung" },
  ]);

  // Work hour settings - stored in localStorage for persistence
  const [workHourSettings, setWorkHourSettings] = useState<WorkHourSetting[]>(() => {
    const saved = localStorage.getItem("workHourSettings");
    if (saved) {
      return JSON.parse(saved);
    }
    // Default settings
    return employees.map(emp => ({
      employeeId: emp.id,
      employeeName: emp.name,
      workHoursPerDay: getDefaultWorkHours(emp.position),
      position: emp.position,
      department: emp.department
    }));
  });

  // Get default work hours based on position
  function getDefaultWorkHours(position: string): number {
    switch (position) {
      case "Kita - Leitung": return 8.5; // Management works slightly more
      case "FSJ": return 6; // FSJ (volunteers) work fewer hours
      case "Erzieher":
      case "Erzieherin":
      default:
        return 8; // Standard work hours
    }
  }

  // Update work hours for an employee
  const updateWorkHours = (employeeId: number, newHours: number) => {
    const updatedSettings = workHourSettings.map(setting => 
      setting.employeeId === employeeId 
        ? { ...setting, workHoursPerDay: newHours }
        : setting
    );
    setWorkHourSettings(updatedSettings);
  };

  // Save settings to localStorage
  const saveSettings = () => {
    localStorage.setItem("workHourSettings", JSON.stringify(workHourSettings));
    toast({
      title: "Einstellungen gespeichert",
      description: "Die Arbeitszeiteinstellungen wurden erfolgreich gespeichert."
    });
  };

  // Reset to default values
  const resetToDefaults = () => {
    const defaultSettings = employees.map(emp => ({
      employeeId: emp.id,
      employeeName: emp.name,
      workHoursPerDay: getDefaultWorkHours(emp.position),
      position: emp.position,
      department: emp.department
    }));
    setWorkHourSettings(defaultSettings);
    toast({
      title: "Zurückgesetzt",
      description: "Alle Einstellungen wurden auf die Standardwerte zurückgesetzt."
    });
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Einstellungen</h1>
            <p className="text-muted-foreground">
              {userRole === "admin" 
                ? "Systemkonfiguration und Arbeitszeiteinstellungen" 
                : "Ihre persönlichen Einstellungen"}
            </p>
          </div>
          {userRole === "admin" && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetToDefaults}>
                Zurücksetzen
              </Button>
              <Button onClick={saveSettings}>
                <Save className="mr-2 h-4 w-4" />
                Speichern
              </Button>
            </div>
          )}
        </div>

        {userRole === "admin" ? (
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
                    {workHourSettings.map((setting) => {
                      const employee = employees.find(emp => emp.id === setting.employeeId);
                      if (!employee) return null;
                      
                      return (
                        <div key={setting.employeeId} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <User className="h-8 w-8 text-muted-foreground p-1 bg-muted rounded-full" />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{formatEmployeeName(employee)}</p>
                                <Badge variant="outline">{setting.position}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{setting.department}</p>
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
                                onChange={(e) => updateWorkHours(setting.employeeId, parseFloat(e.target.value) || 8)}
                                className="w-20 text-center"
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
        ) : (
          // Employee view - limited settings
          <Card>
            <CardHeader>
              <CardTitle>Persönliche Einstellungen</CardTitle>
              <CardDescription>Ihre persönlichen Profileinstellungen</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Persönliche Einstellungen werden hier angezeigt...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Settings;