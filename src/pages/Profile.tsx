import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { User, Save, Mail, User as UserIcon } from "lucide-react";

const Profile = () => {
  const { toast } = useToast();
  const { user, employee, profile } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Profile state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");

  // Initialize form with user data
  useEffect(() => {
    if (user && employee) {
      setFirstName(employee.first_name || "");
      setLastName(employee.last_name || "");
      setEmail(user.email || "");
      setPosition(employee.position || "");
      setDepartment(employee.department || "");
      setIsLoading(false);
    }
  }, [user, employee]);

  const handleSaveProfile = async () => {
    if (!employee?.id) {
      toast({
        title: "Fehler",
        description: "Mitarbeiterdaten nicht gefunden.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Update employee record with new last name
      const { error } = await supabase
        .from('employees')
        .update({ 
          last_name: lastName,
          updated_at: new Date().toISOString()
        })
        .eq('id', employee.id);

      if (error) throw error;

      toast({
        title: "Profil aktualisiert",
        description: "Ihre Profildaten wurden erfolgreich gespeichert."
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Aktualisieren des Profils.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <User className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Lade Profildaten...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mein Profil</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre persönlichen Informationen
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Persönliche Informationen
              </CardTitle>
              <CardDescription>
                Ihre grundlegenden Profildaten
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">Vorname</Label>
                <Input
                  id="first-name"
                  value={firstName}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Nachname *</Label>
                <Input
                  id="last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled
                    className="pl-10"
                  />
                </div>
              </div>
              <Button 
                onClick={handleSaveProfile}
                disabled={isSaving || !lastName.trim()}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Wird gespeichert..." : "Änderungen speichern"}
              </Button>
            </CardContent>
          </Card>

          {/* Employment Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Arbeitsinformationen</CardTitle>
              <CardDescription>
                Ihre Unternehmens- und Positionsdetails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={position}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Abteilung</Label>
                <Input
                  id="department"
                  value={department}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-id">Mitarbeiter-ID</Label>
                <Input
                  id="employee-id"
                  value={employee?.id || ""}
                  disabled
                />
              </div>
              <div className="rounded-lg bg-muted p-4">
                <h4 className="font-medium mb-2">Profilinformationen</h4>
                <p className="text-sm text-muted-foreground">
                  Ihre persönlichen Daten werden von Ihrem Administrator verwaltet. 
                  Für Änderungen an Position oder Abteilung wenden Sie sich bitte an Ihren Vorgesetzten.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;