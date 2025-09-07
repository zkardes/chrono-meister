import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Clock, Users, TrendingUp, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Projects = () => {
  const { toast } = useToast();
  const [showNewProject, setShowNewProject] = useState(false);

  const projects = [
    {
      id: 1,
      name: "Website Redesign",
      client: "TechCorp GmbH",
      status: "In Arbeit",
      progress: 65,
      team: 4,
      deadline: "2024-02-15",
      hours: "124h / 200h",
      budget: "€15,000 / €25,000"
    },
    {
      id: 2,
      name: "Mobile App Development",
      client: "StartUp AG",
      status: "In Arbeit",
      progress: 35,
      team: 6,
      deadline: "2024-03-30",
      hours: "86h / 300h",
      budget: "€8,500 / €45,000"
    },
    {
      id: 3,
      name: "API Integration",
      client: "Enterprise Solutions",
      status: "Planung",
      progress: 10,
      team: 2,
      deadline: "2024-04-15",
      hours: "12h / 120h",
      budget: "€1,200 / €18,000"
    }
  ];

  const handleCreateProject = () => {
    toast({
      title: "Projekt erstellt",
      description: "Das neue Projekt wurde erfolgreich angelegt.",
    });
    setShowNewProject(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Projekte</h1>
            <p className="text-muted-foreground">
              Verwalten Sie alle Ihre aktiven Projekte
            </p>
          </div>
          <Button onClick={() => setShowNewProject(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Neues Projekt
          </Button>
        </div>

        {/* Project Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktive Projekte</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">+2 diese Woche</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesamtstunden</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">222h</div>
              <p className="text-xs text-muted-foreground">Diese Woche</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Mitglieder</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">In allen Projekten</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Umsatz</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€24,700</div>
              <p className="text-xs text-muted-foreground">+12% zum Vormonat</p>
            </CardContent>
          </Card>
        </div>

        {/* Projects List */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Aktiv</TabsTrigger>
            <TabsTrigger value="planning">Planung</TabsTrigger>
            <TabsTrigger value="completed">Abgeschlossen</TabsTrigger>
            <TabsTrigger value="archived">Archiviert</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {projects.map((project) => (
              <Card key={project.id} className="card-hover">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{project.name}</CardTitle>
                      <CardDescription>{project.client}</CardDescription>
                    </div>
                    <Badge variant={project.status === "In Arbeit" ? "default" : "secondary"}>
                      {project.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Fortschritt</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Team</p>
                      <p className="font-medium flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {project.team} Personen
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Deadline</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(project.deadline).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stunden</p>
                      <p className="font-medium">{project.hours}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Budget</p>
                      <p className="font-medium">{project.budget}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm">Details</Button>
                    <Button size="sm" variant="outline">Zeit erfassen</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="planning">
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Keine Projekte in Planung</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed">
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Keine abgeschlossenen Projekte</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="archived">
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Keine archivierten Projekte</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* New Project Dialog */}
        {showNewProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Neues Projekt erstellen</CardTitle>
                <CardDescription>
                  Fügen Sie ein neues Projekt zu Ihrer Verwaltung hinzu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Projektname</Label>
                  <Input placeholder="z.B. Website Redesign" />
                </div>
                <div className="space-y-2">
                  <Label>Kunde</Label>
                  <Input placeholder="z.B. TechCorp GmbH" />
                </div>
                <div className="space-y-2">
                  <Label>Budget</Label>
                  <Input type="number" placeholder="z.B. 25000" />
                </div>
                <div className="space-y-2">
                  <Label>Deadline</Label>
                  <Input type="date" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateProject}>Erstellen</Button>
                  <Button variant="outline" onClick={() => setShowNewProject(false)}>
                    Abbrechen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Projects;