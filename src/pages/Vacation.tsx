import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";

const Vacation = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Urlaubsplanung</h1>
            <p className="text-muted-foreground">Verwalten Sie Urlaubsanträge</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Urlaub beantragen
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Urlaubskalender</CardTitle>
            <CardDescription>Übersicht aller Urlaubstage</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Urlaubsplanung wird geladen...</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Vacation;