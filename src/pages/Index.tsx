import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import Header from '../components/Header';
import SteampunkCockpit from '../components/SteampunkCockpit';
import DevModeToggle from '../components/DevModeToggle';
import GlobalFooter from '../components/GlobalFooter';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { profile: telegramProfile } = useTelegramAuth();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-3 md:p-4 lg:p-6 relative">
      <DevModeToggle />
      <Header onLogoClick={() => navigate('/')} />
      <main className="w-full flex-grow mt-1 md:mt-3">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <SteampunkCockpit
            onClassify={() => handleNavigation('/ai-seller/result')}
            onCalculator={() => handleNavigation('/calculator')}
          />
        </motion.div>
      </main>
      <GlobalFooter />
    </div>
  );
};

export default Index;
