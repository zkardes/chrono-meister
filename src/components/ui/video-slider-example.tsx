import React from 'react';
import { Play, Users, Calendar, Settings, Clock, Umbrella, LayoutDashboard } from 'lucide-react';
import VideoSlider from './video-slider';

const VideoSliderExample = () => {
  const videoData = [
    {
      id: '1',
      title: 'Dashboard Übersicht',
      description: 'Entdecken Sie die leistungsstarken Dashboard-Funktionen, die Ihnen Einblicke in die Produktivität Ihres Teams und den Projektfortschritt geben.',
      videoUrl: '/assets/Dashboard.mov',
      icon: <LayoutDashboard className="w-5 h-5 text-blue-500" />,
      paginationIcon: <LayoutDashboard className="w-4 h-4 text-blue-500" />
    },
    {
      id: '2',
      title: 'Mitarbeiter Verwaltung',
      description: 'Erfahren Sie, wie Sie Ihre Teammitglieder verwalten, Rollen zuweisen und deren Leistung effektiv verfolgen können.',
      videoUrl: '/assets/Employee.mov',
      icon: <Users className="w-5 h-5 text-green-500" />,
      paginationIcon: <Users className="w-4 h-4 text-green-500" />
    },
    {
      id: '3',
      title: 'Gruppen Zusammenarbeit',
      description: 'Erfahren Sie, wie Sie Gruppen für eine bessere Teamzusammenarbeit und Projektorganisation erstellen und verwalten können.',
      videoUrl: '/assets/Groups.mov',
      icon: <Users className="w-5 h-5 text-purple-500" />,
      paginationIcon: <Users className="w-4 h-4 text-purple-500" />
    },
    {
      id: '4',
      title: 'Einfache Planung',
      description: 'Sehen Sie, wie unser intuitives Planungssystem Ihnen hilft, Projekte zu planen und Ressourcen effizient zuzuweisen.',
      videoUrl: '/assets/Scheduling.mov',
      icon: <Calendar className="w-5 h-5 text-orange-500" />,
      paginationIcon: <Calendar className="w-4 h-4 text-orange-500" />
    },
    {
      id: '5',
      title: 'Anpassbare Einstellungen',
      description: 'Konfigurieren Sie die Anwendung so, dass sie Ihrem Workflow mit unserem umfassenden Einstellungsbereich entspricht.',
      videoUrl: '/assets/Settings.mov',
      icon: <Settings className="w-5 h-5 text-red-500" />,
      paginationIcon: <Settings className="w-4 h-4 text-red-500" />
    },
    {
      id: '6',
      title: 'Zeiterfassung',
      description: 'Verstehen Sie, wie unsere Zeiterfassungsfunktion Ihnen hilft, den Projektfortschritt und abrechenbare Stunden zu überwachen.',
      videoUrl: '/assets/Time-Tracking.mov',
      icon: <Clock className="w-5 h-5 text-yellow-500" />,
      paginationIcon: <Clock className="w-4 h-4 text-yellow-500" />
    },
    {
      id: '7',
      title: 'Urlaubsverwaltung',
      description: 'Erfahren Sie, wie Sie Teamurlaube und Freizeiten mit unserem integrierten Urlaubsplanungssystem verwalten können.',
      videoUrl: '/assets/Vacation.mov',
      icon: <Umbrella className="w-5 h-5 text-teal-500" />,
      paginationIcon: <Umbrella className="w-4 h-4 text-teal-500" />
    }
  ];

  return (
    <div className="container mx-auto py-12">
      <h2 className="text-3xl font-bold text-center mb-8">Features in Aktion</h2>
      <VideoSlider 
        data={videoData} 
        autoplay={true}
        autoplayInterval={7000}
        showPagination={true}
        showNavigation={false}
      />
    </div>
  );
};

export default VideoSliderExample;