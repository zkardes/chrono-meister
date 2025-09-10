import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus, User, Mail, Phone, Calendar, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Employees = () => {
  const { toast } = useToast();

  const employeeEntries = [
    { 
      id: 1, 
      name: "Max Mustermann", 
      email: "max.mustermann@company.com", 
      phone: "+49 123 456789", 
      position: "Erzieher", 
      department: "Kita", 
      startDate: "2023-01-15",
      status: "Aktiv"
    },
    { 
      id: 2, 
      name: "Anna Schmidt", 
      email: "anna.schmidt@company.com", 
      phone: "+49 987 654321", 
      position: "Erzieherin", 
      department: "Kita", 
      startDate: "2022-03-10",
      status: "Aktiv"
    },
    { 
      id: 3, 
      name: "Thomas Weber", 
      email: "thomas.weber@company.com", 
      phone: "+49 555 123456", 
      position: "Kita - Leitung", 
      department: "Management", 
      startDate: "2023-06-01",
      status: "Aktiv"
    },
    { 
      id: 4, 
      name: "Lisa Müller", 
      email: "lisa.mueller@company.com", 
      phone: "+49 777 987654", 
      position: "FSJ", 
      department: "Ausbildung", 
      startDate: "2023-08-15",
      status: "Urlaub"
    },
  ];

  const handleAddEmployee = () => {
    toast({
      title: "Mitarbeiter hinzugefügt",
      description: "Der neue Mitarbeiter wurde erfolgreich hinzugefügt.",
    });
  };

  const handleExport = () => {
    toast({
      title: "Export gestartet",
      description: "Die Mitarbeiterdaten werden heruntergeladen.",
    });
  };

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
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Employee Entries */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">Mitarbeiterliste</TabsTrigger>
            <TabsTrigger value="add">Mitarbeiter hinzufügen</TabsTrigger>
            <TabsTrigger value="statistics">Statistiken</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Alle Mitarbeiter</CardTitle>
                <CardDescription>
                  Übersicht aller registrierten Mitarbeiter
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {employeeEntries.map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between p-4 rounded-lg hover:bg-muted border">
                      <div className="flex items-center gap-4">
                        <User className="h-8 w-8 text-muted-foreground p-1 bg-muted rounded-full" />
                        <div className="space-y-1">
                          <p className="font-semibold">{employee.name}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {employee.email}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {employee.phone}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-semibold">{employee.position}</p>
                        <p className="text-sm text-muted-foreground">{employee.department}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Seit {employee.startDate}
                        </div>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          employee.status === 'Aktiv' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {employee.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>Neuen Mitarbeiter hinzufügen</CardTitle>
                <CardDescription>
                  Fügen Sie einen neuen Mitarbeiter zum System hinzu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vorname</Label>
                    <Input placeholder="Max" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nachname</Label>
                    <Input placeholder="Mustermann" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>E-Mail-Adresse</Label>
                  <Input type="email" placeholder="max.mustermann@company.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input type="tel" placeholder="+49 123 456789" />
                  </div>
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Input placeholder="Softwareentwickler" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Abteilung</Label>
                    <Input placeholder="IT" />
                  </div>
                  <div className="space-y-2">
                    <Label>Startdatum</Label>
                    <Input type="date" />
                  </div>
                </div>
                <Button onClick={handleAddEmployee}>
                  <Plus className="mr-2 h-4 w-4" />
                  Mitarbeiter hinzufügen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics">
            <Card>
              <CardHeader>
                <CardTitle>Team-Statistiken</CardTitle>
                <CardDescription>
                  Übersicht über Ihr Team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Aktive Mitarbeiter</p>
                    <p className="text-2xl font-bold">3</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Abteilungen</p>
                    <p className="text-2xl font-bold">4</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Neue Mitarbeiter (Monat)</p>
                    <p className="text-2xl font-bold text-primary">2</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Employees;