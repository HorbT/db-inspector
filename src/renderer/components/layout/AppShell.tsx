import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { ToastContainer } from './Toast';
import { InspectionPage } from '../inspection/InspectionPage';
import { ReportPage } from '../report/ReportPage';
import { SettingsPage } from '../config/SettingsPage';

export function AppShell(): React.ReactElement {
  const { currentView } = useUIStore();

  const renderPage = () => {
    switch (currentView) {
      case 'inspection':
        return <InspectionPage />;
      case 'reports':
        return <ReportPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <InspectionPage />;
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-muted/30 p-4">
          {renderPage()}
        </main>
      </div>
      <StatusBar />
      <ToastContainer />
    </div>
  );
}

function StatusBar(): React.ReactElement {
  const connections = 0; // Will be connected to store
  return (
    <div className="h-7 border-t bg-muted/50 px-4 flex items-center text-xs text-muted-foreground gap-4">
      <span>就绪</span>
      <span className="flex-1" />
      <span>连接数: {connections}</span>
    </div>
  );
}
