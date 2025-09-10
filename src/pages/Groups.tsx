import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Building, Plus, Users, User, Download, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Groups = () => {
  const { toast } = useToast();
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);

  // Available employees to add to groups
  const availableEmployees = [
    { id: 1, name: "Max Mustermann", position: "Softwareentwickler", department: "IT" },
    { id: 2, name: "Anna Schmidt", position: "Projektmanagerin", department: "Management" },
    { id: 3, name: "Thomas Weber", position: "Designer", department: "Design" },
    { id: 4, name: "Lisa Müller", position: "Marketing Spezialistin", department: "Marketing" },
    { id: 5, name: "Peter Klein", position: "DevOps Engineer", department: "IT" },
    { id: 6, name: "Sarah Johnson", position: "UX Designerin", department: "Design" },
  ];

  // Existing groups with their members
  const groupEntries = [
    {
      id: 1,
      name: "Entwicklungsteam",
      description: "Frontend und Backend Entwickler",
      department: "IT",
      manager: "Max Mustermann",
      memberCount: 5,
      members: [
        { id: 1, name: "Max Mustermann", position: "Softwareentwickler" },
        { id: 5, name: "Peter Klein", position: "DevOps Engineer" },
      ],
      created: "2024-01-15",
      status: "Aktiv"
    },
    {
      id: 2,
      name: "Design Team",
      description: "UI/UX Design und Grafik",
      department: "Design",
      manager: "Thomas Weber",
      memberCount: 3,
      members: [
        { id: 3, name: "Thomas Weber", position: "Designer" },
        { id: 6, name: "Sarah Johnson", position: "UX Designerin" },
      ],
      created: "2024-02-01",
      status: "Aktiv"
    },
    {
      id: 3,
      name: "Marketing Team",
      description: "Marketing und Kommunikation",
      department: "Marketing",
      manager: "Lisa Müller",
      memberCount: 2,
      members: [
        { id: 4, name: "Lisa Müller", position: "Marketing Spezialistin" },
      ],
      created: "2024-01-20",
      status: "Aktiv"
    },
  ];

  const handleCreateGroup = () => {
    toast({
      title: "Gruppe erstellt",
      description: "Die neue Gruppe wurde erfolgreich erstellt.",
    });
  };

  const handleAddEmployeesToGroup = () => {
    if (selectedEmployees.length === 0) {
      toast({
        title: "Keine Mitarbeiter ausgewählt",
        description: "Bitte wählen Sie mindestens einen Mitarbeiter aus.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Mitarbeiter hinzugefügt",
      description: `${selectedEmployees.length} Mitarbeiter zur Gruppe hinzugefügt.`,
    });
    setSelectedEmployees([]);
  };

  const handleExport = () => {
    toast({
      title: "Export gestartet",
      description: "Die Gruppendaten werden heruntergeladen.",
    });
  };

  const toggleEmployeeSelection = (employeeId: number) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const removeEmployeeFromSelection = (employeeId: number) => {
    setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gruppen</h1>
            <p className="text-muted-foreground">
              Verwalten Sie Teams, Abteilungen und Mitarbeiterzuordnungen
            </p>
          </div>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Group Management */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">Gruppenliste</TabsTrigger>
            <TabsTrigger value="create">Gruppe erstellen</TabsTrigger>
            <TabsTrigger value="assign">Mitarbeiter zuordnen</TabsTrigger>
            <TabsTrigger value="statistics">Statistiken</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Alle Gruppen</CardTitle>
                <CardDescription>
                  Übersicht aller Teams und Abteilungen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {groupEntries.map((group) => (
                    <div key={group.id} className="border rounded-lg p-4 hover:bg-muted/50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Building className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold text-lg">{group.name}</h3>
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              group.status === 'Aktiv' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {group.status}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{group.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Abteilung: {group.department}</span>
                            <span>Manager: {group.manager}</span>
                            <span>Erstellt: {group.created}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                            <Users className="h-4 w-4" />
                            {group.memberCount} Mitglieder
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t pt-3">
                        <p className="text-sm font-medium mb-2">Mitglieder:</p>
                        <div className="flex flex-wrap gap-2">
                          {group.members.map((member) => (
                            <div key={member.id} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1">
                              <User className="h-3 w-3" />
                              <span className="text-sm">{member.name}</span>
                              <span className="text-xs text-muted-foreground">({member.position})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Neue Gruppe erstellen</CardTitle>
                <CardDescription>
                  Erstellen Sie eine neue Gruppe oder ein neues Team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Gruppenname</Label>
                  <Input placeholder="z.B. Entwicklungsteam" />
                </div>
                <div className="space-y-2">
                  <Label>Beschreibung</Label>
                  <Input placeholder="Kurze Beschreibung der Gruppe" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Abteilung</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Abteilung auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="it">IT</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="management">Management</SelectItem>
                        <SelectItem value="hr">Human Resources</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Gruppenmanager</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Manager auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableEmployees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id.toString()}>
                            {employee.name} ({employee.position})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreateGroup}>
                  <Plus className="mr-2 h-4 w-4" />
                  Gruppe erstellen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assign">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Mitarbeiter auswählen</CardTitle>
                  <CardDescription>
                    Wählen Sie Mitarbeiter aus, die einer Gruppe zugeordnet werden sollen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {availableEmployees.map((employee) => (
                      <div key={employee.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted">
                        <Checkbox
                          id={`employee-${employee.id}`}
                          checked={selectedEmployees.includes(employee.id)}
                          onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                        />
                        <div className="flex-1">
                          <Label htmlFor={`employee-${employee.id}`} className="font-medium cursor-pointer">
                            {employee.name}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {employee.position} • {employee.department}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ausgewählte Mitarbeiter ({selectedEmployees.length})</CardTitle>
                  <CardDescription>
                    Mitarbeiter, die einer Gruppe zugeordnet werden
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Zielgruppe</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Gruppe auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {groupEntries.map((group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name} ({group.department})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Ausgewählte Mitarbeiter:</Label>
                    <div className="min-h-[200px] max-h-[300px] overflow-y-auto space-y-2">
                      {selectedEmployees.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-8">
                          Keine Mitarbeiter ausgewählt
                        </p>
                      ) : (
                        selectedEmployees.map((employeeId) => {
                          const employee = availableEmployees.find(emp => emp.id === employeeId);
                          return employee ? (
                            <div key={employee.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                              <div>
                                <p className="font-medium">{employee.name}</p>
                                <p className="text-sm text-muted-foreground">{employee.position}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeEmployeeFromSelection(employee.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : null;
                        })
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleAddEmployeesToGroup}
                    disabled={selectedEmployees.length === 0}
                    className="w-full"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Mitarbeiter zur Gruppe hinzufügen
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="statistics">
            <Card>
              <CardHeader>
                <CardTitle>Gruppen-Statistiken</CardTitle>
                <CardDescription>
                  Übersicht über alle Gruppen und Teams
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Aktive Gruppen</p>
                    <p className="text-2xl font-bold">{groupEntries.length}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Gesamte Mitglieder</p>
                    <p className="text-2xl font-bold">{groupEntries.reduce((sum, group) => sum + group.memberCount, 0)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Abteilungen</p>
                    <p className="text-2xl font-bold">{new Set(groupEntries.map(group => group.department)).size}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Durchschn. Gruppengröße</p>
                    <p className="text-2xl font-bold text-primary">
                      {Math.round(groupEntries.reduce((sum, group) => sum + group.memberCount, 0) / groupEntries.length)}
                    </p>
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

export default Groups;