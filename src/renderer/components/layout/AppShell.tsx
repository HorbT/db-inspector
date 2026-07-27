import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../store/uiStore';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { StatusBar } from './StatusBar';
import { ToastContainer } from './Toast';
import { InspectionPage } from '../inspection/InspectionPage';
import { ReportPage } from '../report/ReportPage';
import { SettingsPage } from '../config/SettingsPage';
import { fadeUpVariants } from '@renderer/lib/motion';

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
        <AnimatePresence mode="wait">
          <motion.main
            key={currentView}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="flex-1 overflow-auto bg-muted/30 p-4"
          >
            {renderPage()}
          </motion.main>
        </AnimatePresence>
      </div>
      <StatusBar />
      <ToastContainer />
    </div>
  );
}
