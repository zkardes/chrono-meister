import React from 'react';
import SliderWeb from './slider-web';
import { Clock, Users, BarChart3, Calendar, FileText, Zap } from 'lucide-react';

const SliderExample = () => {
  const sliderData = [
    {
      id: '1',
      title: 'Time Tracking',
      description: 'Track time spent on projects and tasks with a single click. No more manual timesheets or forgotten hours.',
      icon: <Clock className="w-12 h-12 text-blue-500" />
    },
    {
      id: '2',
      title: 'Team Management',
      description: 'Manage your team members, assign projects, and track their progress all in one place.',
      icon: <Users className="w-12 h-12 text-green-500" />
    },
    {
      id: '3',
      title: 'Detailed Reports',
      description: 'Generate comprehensive reports to analyze productivity and project profitability.',
      icon: <BarChart3 className="w-12 h-12 text-purple-500" />
    },
    {
      id: '4',
      title: 'Project Planning',
      description: 'Plan your projects with timelines, milestones, and resource allocation.',
      icon: <Calendar className="w-12 h-12 text-orange-500" />
    },
    {
      id: '5',
      title: 'Invoicing',
      description: 'Create professional invoices based on tracked time and send them to clients.',
      icon: <FileText className="w-12 h-12 text-red-500" />
    },
    {
      id: '6',
      title: 'Fast & Simple',
      description: 'Start tracking time in seconds. No complicated setups or training required.',
      icon: <Zap className="w-12 h-12 text-yellow-500" />
    }
  ];

  return (
    <div className="container mx-auto py-12">
      <h2 className="text-3xl font-bold text-center mb-8">Powerful Features</h2>
      <SliderWeb 
        data={sliderData} 
        autoplay={true}
        autoplayInterval={4000}
        showPagination={true}
        showNavigation={true}
      />
    </div>
  );
};

export default SliderExample;