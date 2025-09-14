import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Clock, FileText, Users, Calendar, TrendingUp, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  const features = [
    {
      icon: Clock,
      title: "Zeiterfassung",
      description: "Digitale Stempeluhr mit automatischer Pausenregelung und Compliance-Prüfung"
    },
    {
      icon: FileText,
      title: "Digital Management",
      description: "Kein Papierkram mehr - Alles digital"
    },
    {
      icon: Users,
      title: "Mitarbeiterverwaltung",
      description: "Teams und Abteilungen verwalten mit Gruppen-Berechtigungen"
    },
    {
      icon: Calendar,
      title: "Urlaubsplanung",
      description: "Digitale Urlaubsanträge mit Genehmigungsworkflow"
    },
    {
      icon: TrendingUp,
      title: "Echtzeit-Analytics",
      description: "Live-Dashboard mit Auswertungen und Berichten"
    },
    {
      icon: Shield,
      title: "DSGVO-konform",
      description: "Höchste Sicherheitsstandards"
    }
  ];

  const testimonials = [
    {
      quote: "Korrekturen von 10% auf 1-2% reduziert",
      author: "Thomas M.",
      role: "Geschäftsführer, Bauunternehmen",
      company: "Müller Bau GmbH"
    },
    {
      quote: "Lohnabrechnung von 5 auf 3 Tage verkürzt",
      author: "Sandra K.",
      role: "HR-Leiterin",
      company: "TechSolutions AG"
    },
    {
      quote: "Einrichtung in unter 10 Minuten - genial einfach!",
      author: "Michael B.",
      role: "Projektleiter",
      company: "Digital Services GmbH"
    }
  ];

  const pricing = [
    {
      name: "Starter",
      price: "9,90",
      description: "Basis-Zeiterfassung",
      features: [
        "Bis zu 5 Mitarbeiter",
        "Digitale Stempeluhr",
        "Pausenregelung",
        "Urlaubsplanung",
        "Schichtplanung",
        "Export-Funktion",
        "Email-Support"
      ]
    },
    {
      name: "Projekt",
      price: "19,90",
      description: "Mit Projektmanagement",
      features: [
        "Bis zu 20 Mitarbeiter",
        "Digitale Stempeluhr",
        "Pausenregelung",
        "Urlaubsplanung",
        "Schichtplanung",
        "Export-Funktion",
        "Priority-Support"
      ],
      popular: true
    },
    {
      name: "Komplett",
      price: "39,90",
      description: "Vollausstattung",
      features: [
        "Bis zu 100 Mitarbeiter",
        "Digitale Stempeluhr",
        "Pausenregelung",
        "Urlaubsplanung",
        "Schichtplanung",
        "Export-Funktion",
        "Persönlicher Support"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">TimeTrack Pro</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Funktionen
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
                Referenzen
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Preise
              </a>
              <Link to="/login">
                <Button variant="outline">Anmelden</Button>
              </Link>
              <Link to="/register">
                <Button variant="hero">Registrieren</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center animate-slide-up">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Zeiterfassung für kleine
            <span className="text-primary"> Unternehmen</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Digitalisieren Sie Ihre Arbeitszeiterfassung und Mitarbeiterverwaltung.
            <br/>Einfach zu bedienen und in unter 10 Minuten eingerichtet.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/register">
              <Button size="xl" variant="hero">
                <Zap className="mr-2" />
                Jetzt starten
              </Button>
            </Link>
            <Link to="/login">
            <Button size="xl" variant="outline">
              Demo ansehen
            </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Keine Kreditkarte erforderlich • Keine Kündigungsfrist
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Alles was Sie brauchen</h2>
          <p className="text-xl text-muted-foreground">
            Komplettlösung für digitale Zeiterfassung und Mitarbeiterverwaltung
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 card-hover">
              <feature.icon className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="bg-muted/30 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Das sagen unsere Kunden</h2>
            <p className="text-xl text-muted-foreground">
              Über 1.000 Unternehmen vertrauen auf TimeTrack Pro
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <div className="mb-4">
                  <p className="text-lg italic">"{testimonial.quote}"</p>
                </div>
                <div className="border-t pt-4">
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.company}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Transparente Preise</h2>
          <p className="text-xl text-muted-foreground">
            Monatlich kündbar, keine versteckten Kosten
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pricing.map((plan, index) => (
            <Card key={index} className={`p-6 ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
              {plan.popular && (
                <div className="bg-primary text-primary-foreground text-sm font-semibold px-3 py-1 rounded-full inline-block mb-4">
                  Beliebt
                </div>
              )}
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-muted-foreground mb-4">{plan.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}€</span>
                <span className="text-muted-foreground">/Monat</span>
              </div>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-success mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register">
                <Button className="w-full" variant={plan.popular ? "hero" : "default"}>
                  Jetzt starten
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/30 border-t">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">TimeTrack Pro</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Die moderne Lösung für digitale Zeiterfassung
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Produkt</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Funktionen</a></li>
                <li><a href="#" className="hover:text-foreground">Preise</a></li>
                <li><a href="#" className="hover:text-foreground">Updates</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Unternehmen</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Über uns</a></li>
                <li><a href="#" className="hover:text-foreground">Kontakt</a></li>
                <li><a href="#" className="hover:text-foreground">Karriere</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Rechtliches</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Impressum</a></li>
                <li><a href="#" className="hover:text-foreground">Datenschutz</a></li>
                <li><a href="#" className="hover:text-foreground">AGB</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            © 2024 TimeTrack Pro. Alle Rechte vorbehalten. Made with ❤️ in Germany
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;