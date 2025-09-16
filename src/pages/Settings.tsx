import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Clock, User, Save, Users, Key, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { useAuthActions } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const { toast } = useToast();
  const { employee, company, user, isAdmin, isManager } = useAuthContext();
  const { loading: authLoading, signOut } = useAuthActions();
  
  // Employee work hour setting
  const [workHoursPerDay, setWorkHoursPerDay] = useState<number>(8);
  const [originalWorkHours, setOriginalWorkHours] = useState<number>(8);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Account settings state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Check if user can edit work hours (only managers and admins)
  const canEditWorkHours = isAdmin || isManager;

  // Fetch employee's work hour setting
  useEffect(() => {
    const fetchWorkHourSetting = async () => {
      if (!employee?.id || !company?.id) return;
      
      setIsLoading(true);
      try {
        // Get company settings which includes employee-specific work hours
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('settings')
          .eq('id', company.id)
          .single();
        
        if (companyError) throw companyError;
        
        // Extract work hour setting for this employee from company settings with proper type checking
        const companySettings = companyData?.settings || {};
        let employeeWorkHours = 8;
        
        if (typeof companySettings === 'object' && companySettings !== null && 'employee_work_hours' in companySettings) {
          const workHoursObj = companySettings.employee_work_hours;
          if (typeof workHoursObj === 'object' && workHoursObj !== null && employee.id in workHoursObj) {
            employeeWorkHours = workHoursObj[employee.id] as number;
          }
        }
        
        setWorkHoursPerDay(employeeWorkHours);
        setOriginalWorkHours(employeeWorkHours);
      } catch (error) {
        console.error('Error fetching work hour setting:', error);
        toast({
          title: "Fehler",
          description: "Fehler beim Laden der Arbeitszeiteinstellungen.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWorkHourSetting();
  }, [employee?.id, company?.id]);

  // Save work hour setting to database
  const saveSettings = async () => {
    // Only managers and admins can save work hour settings
    if (!canEditWorkHours) {
      toast({
        title: "Keine Berechtigung",
        description: "Nur Manager und Administratoren können Arbeitszeiten ändern.",
        variant: "destructive"
      });
      return;
    }

    if (!employee?.id || !company?.id) return;
    
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
      let employeeWorkHours = {};
      
      if (typeof companySettings === 'object' && companySettings !== null && 'employee_work_hours' in companySettings) {
        const workHoursObj = companySettings.employee_work_hours;
        if (typeof workHoursObj === 'object' && workHoursObj !== null) {
          employeeWorkHours = { ...workHoursObj };
        }
      }
      
      // Update the specific employee's work hours
      if (typeof employeeWorkHours === 'object' && employeeWorkHours !== null) {
        employeeWorkHours[employee.id] = workHoursPerDay;
      }
      
      const updatedSettings = {
        ...companySettings,
        employee_work_hours: employeeWorkHours
      };
      
      const { error: updateError } = await supabase
        .from('companies')
        .update({ settings: updatedSettings })
        .eq('id', company.id);
      
      if (updateError) throw updateError;
      
      setOriginalWorkHours(workHoursPerDay);
      toast({
        title: "Einstellungen gespeichert",
        description: "Die Arbeitszeiteinstellungen wurden erfolgreich gespeichert."
      });
    } catch (error) {
      console.error('Error saving work hour setting:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Speichern der Arbeitszeiteinstellungen.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Update user password
  const updatePassword = async () => {
    if (!user) {
      toast({
        title: "Fehler",
        description: "Kein Benutzer angemeldet.",
        variant: "destructive"
      });
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Passwortfelder aus.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Fehler",
        description: "Die neuen Passwörter stimmen nicht überein.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Fehler",
        description: "Das neue Passwort muss mindestens 6 Zeichen lang sein.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      // First, verify the current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        toast({
          title: "Fehler",
          description: "Das aktuelle Passwort ist falsch.",
          variant: "destructive"
        });
        return;
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      toast({
        title: "Passwort aktualisiert",
        description: "Ihr Passwort wurde erfolgreich geändert."
      });

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Aktualisieren des Passworts.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Update user email
  const updateEmail = async () => {
    if (!user) {
      toast({
        title: "Fehler",
        description: "Kein Benutzer angemeldet.",
        variant: "destructive"
      });
      return;
    }

    if (!newEmail) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie eine neue E-Mail-Adresse ein.",
        variant: "destructive"
      });
      return;
    }

    if (newEmail === user.email) {
      toast({
        title: "Fehler",
        description: "Die neue E-Mail-Adresse ist identisch mit der aktuellen.",
        variant: "destructive"
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingEmail(true);
    try {
      // Update the email
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (updateError) throw updateError;

      toast({
        title: "E-Mail-Adresse aktualisiert",
        description: "Ihre E-Mail-Adresse wurde erfolgreich geändert. Bitte überprüfen Sie Ihr Postfach zur Bestätigung."
      });

      // Clear email field
      setNewEmail("");
    } catch (error) {
      console.error('Error updating email:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Aktualisieren der E-Mail-Adresse.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  // Check if settings have been modified
  const hasUnsavedChanges = workHoursPerDay !== originalWorkHours;

  // Show loading state
  if (isLoading) {
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Einstellungen</h1>
            <p className="text-muted-foreground">
              {user?.email ? `Angemeldet als: ${user.email}` : "Ihre persönlichen Einstellungen"}
            </p>
          </div>
          {(canEditWorkHours || hasUnsavedChanges) && (
            <div className="flex gap-2">
              {canEditWorkHours && (
                <Button 
                  variant="outline" 
                  onClick={() => setWorkHoursPerDay(8)}
                  disabled={isSaving}
                >
                  Zurücksetzen
                </Button>
              )}
              <Button 
                onClick={saveSettings}
                disabled={isSaving || !hasUnsavedChanges || !canEditWorkHours}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Speichern..." : "Speichern"}
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="workhours" className="space-y-4">
          <TabsList>
            <TabsTrigger value="workhours">Arbeitszeiten</TabsTrigger>
            <TabsTrigger value="account">Konto</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="notifications">Benachrichtigungen</TabsTrigger>
          </TabsList>

          <TabsContent value="workhours">
            <Card>
              <CardHeader>
                <CardTitle>Ihre Arbeitszeit-Einstellungen</CardTitle>
                <CardDescription>
                  {canEditWorkHours 
                    ? "Konfigurieren Sie Ihre täglichen Arbeitsstunden. Diese Einstellung beeinflusst Ihre Überstunden-Berechnung."
                    : "Ihre täglichen Arbeitsstunden. Diese Einstellung beeinflusst Ihre Überstunden-Berechnung."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Work Hours Setting */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <User className="h-8 w-8 text-muted-foreground p-1 bg-muted rounded-full" />
                    <div>
                      <p className="font-semibold">
                        {employee?.first_name} {employee?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {employee?.position || "Keine Position"}
                      </p>
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
                        value={workHoursPerDay}
                        onChange={(e) => canEditWorkHours ? setWorkHoursPerDay(parseFloat(e.target.value) || 8) : null}
                        className="w-20 text-center"
                        disabled={isSaving || !canEditWorkHours}
                      />
                      <span className="text-sm text-muted-foreground">h</span>
                    </div>
                  </div>
                </div>

                {/* Summary Information */}
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Informationen zur Überstunden-Berechnung</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Überstunden werden automatisch berechnet, wenn Sie die tägliche Arbeitszeit überschreiten</p>
                    <p>• Für einen freien Tag benötigen Sie so viele Überstunden wie Ihre tägliche Arbeitszeit</p>
                    <p>• Beispiel: Bei 8 Stunden/Tag benötigen Sie 8 Überstunden für einen freien Tag</p>
                  </div>
                </div>
                
                {/* Permission Notice for Employees */}
                {!canEditWorkHours && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      ℹ️ Ihre Arbeitszeiten werden von Ihrem Manager oder Administrator verwaltet. 
                      Für Änderungen wenden Sie sich bitte an Ihren Vorgesetzten.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Change Password Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Passwort ändern
                  </CardTitle>
                  <CardDescription>
                    Ändern Sie Ihr Passwort für mehr Sicherheit
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Aktuelles Passwort</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={isUpdatingPassword}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Neues Passwort</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isUpdatingPassword}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Neues Passwort bestätigen</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isUpdatingPassword}
                    />
                  </div>
                  <Button 
                    onClick={updatePassword}
                    disabled={isUpdatingPassword}
                    className="w-full"
                  >
                    {isUpdatingPassword ? "Wird aktualisiert..." : "Passwort ändern"}
                  </Button>
                </CardContent>
              </Card>

              {/* Change Email Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    E-Mail-Adresse ändern
                  </CardTitle>
                  <CardDescription>
                    Ändern Sie Ihre E-Mail-Adresse für die Anmeldung
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-email">Aktuelle E-Mail-Adresse</Label>
                    <Input
                      id="current-email"
                      value={user?.email || ""}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-email">Neue E-Mail-Adresse</Label>
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="neue.email@beispiel.de"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      disabled={isUpdatingEmail}
                    />
                  </div>
                  <Button 
                    onClick={updateEmail}
                    disabled={isUpdatingEmail}
                    className="w-full"
                  >
                    {isUpdatingEmail ? "Wird aktualisiert..." : "E-Mail-Adresse ändern"}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Nach der Änderung erhalten Sie eine Bestätigungs-E-Mail an Ihre neue Adresse.
                  </p>
                </CardContent>
              </Card>
            </div>
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

export default Settings;