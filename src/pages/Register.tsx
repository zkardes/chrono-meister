import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, Eye, EyeOff, Mail, Building, User } from "lucide-react";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    companySize: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Fehler",
        description: "Die Passwörter stimmen nicht überein.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Fehler",
        description: "Das Passwort muss mindestens 8 Zeichen lang sein.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Simulate registration
    setTimeout(() => {
      toast({
        title: "Registrierung erfolgreich!",
        description: "Ihr Konto wurde erstellt. Sie können sich jetzt anmelden.",
      });
      navigate("/login");
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-2xl animate-slide-up">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Clock className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Konto erstellen</CardTitle>
          <CardDescription className="text-center">
            Starten Sie Ihre 30-tägige kostenlose Testversion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Vorname</Label>
                <div className="relative">
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Max"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="pl-10"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nachname</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Mustermann"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Firmenname</Label>
              <div className="relative">
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Musterfirma GmbH"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                  className="pl-10"
                />
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companySize">Unternehmensgröße</Label>
              <Select 
                value={formData.companySize} 
                onValueChange={(value) => setFormData({ ...formData, companySize: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Anzahl Mitarbeiter wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-5">1-5 Mitarbeiter</SelectItem>
                  <SelectItem value="6-20">6-20 Mitarbeiter</SelectItem>
                  <SelectItem value="21-50">21-50 Mitarbeiter</SelectItem>
                  <SelectItem value="51-100">51-100 Mitarbeiter</SelectItem>
                  <SelectItem value="100+">Über 100 Mitarbeiter</SelectItem>
                </SelectContent>
              </Select>
            </div>

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

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 Zeichen"
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
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Passwort wiederholen"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-start space-x-2 text-sm">
                <input type="checkbox" className="rounded border-gray-300 mt-1" required />
                <span>
                  Ich akzeptiere die{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Allgemeinen Geschäftsbedingungen
                  </Link>{" "}
                  und die{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Datenschutzerklärung
                  </Link>
                </span>
              </label>
            </div>

            <Button type="submit" className="w-full" size="lg" variant="hero" disabled={isLoading}>
              {isLoading ? "Konto wird erstellt..." : "Kostenlos registrieren"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-center w-full text-muted-foreground">
            Bereits ein Konto?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Jetzt anmelden
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Register;