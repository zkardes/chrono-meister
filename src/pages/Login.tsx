import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock, Eye, EyeOff, Mail } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate authentication
    setTimeout(() => {
      if (formData.email === "admin@demo.de" && formData.password === "admin123") {
        toast({
          title: "Willkommen zurück!",
          description: "Sie wurden erfolgreich angemeldet.",
        });
        localStorage.setItem("userRole", "admin");
        navigate("/dashboard");
      } else if (formData.email === "user@demo.de" && formData.password === "user123") {
        toast({
          title: "Willkommen zurück!",
          description: "Sie wurden erfolgreich angemeldet.",
        });
        localStorage.setItem("userRole", "employee");
        navigate("/dashboard");
      } else {
        toast({
          title: "Anmeldung fehlgeschlagen",
          description: "Bitte überprüfen Sie Ihre Zugangsdaten.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 1000);
  };

  const handleGoogleLogin = () => {
    toast({
      title: "Google-Anmeldung",
      description: "Diese Funktion wird in Kürze verfügbar sein.",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md animate-slide-up">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Clock className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Anmelden</CardTitle>
          <CardDescription className="text-center">
            Melden Sie sich in Ihrem TimeTrack Pro Konto an
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail-Adresse</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@firma.de"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="pl-10"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" className="rounded border-gray-300" />
                <span>Angemeldet bleiben</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Passwort vergessen?
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Anmeldung läuft..." : "Anmelden"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Oder</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Mit Google anmelden
          </Button>

          <div className="text-sm text-center space-y-2">
            <p className="text-muted-foreground">Demo-Zugänge:</p>
            <p className="text-xs">
              Admin: admin@demo.de / admin123<br/>
              Mitarbeiter: user@demo.de / user123
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-center w-full text-muted-foreground">
            Noch kein Konto?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Jetzt registrieren
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;