import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Einstellungen</h1>
          <p className="text-muted-foreground">Systemkonfiguration</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Systemeinstellungen</CardTitle>
            <CardDescription>Konfigurieren Sie Ihre Anwendung</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <SettingsIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Einstellungen werden geladen...</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;