import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TelegramAuthProvider } from "./contexts/TelegramAuthContext";
import { LinkEmailModal } from "./components/auth/LinkEmailModal";
import BootLoader from "./components/BootLoader";
import BackgroundArtwork from "./components/BackgroundArtwork";
import ModelBackground from "./components/ModelBackground";
import Index from "./pages/Index";
import AISeller from "./pages/AISeller";
import AISellerResult from "./pages/AISellerResult";
import AISellerPlans from "./pages/AISellerPlans";
import AISellerPlanDetails from "./pages/AISellerPlanDetails";
import CalculatorStep1 from "./pages/CalculatorStep1";
import CalculatorStep2 from "./pages/CalculatorStep2";
import CalculatorStep3 from "./pages/CalculatorStep3";
import CalculatorStep4 from "./pages/CalculatorStep4";
import CalculatorStep5 from "./pages/CalculatorStep5";
import CalculatorStep6 from "./pages/CalculatorStep6";
import CalculatorStep7 from "./pages/CalculatorStep7";
import CalculatorStep8 from "./pages/CalculatorStep8";
import ExpertSelection from "./pages/ExpertSelection";
import ExpertHistory from "./pages/ExpertHistory";
import TelegramProfile from "./pages/TelegramProfile";
import AdminCRM from "./pages/AdminCRM";
import CRMDashboard from "./pages/CRMDashboard";
import CRMAdmins from "./pages/CRMAdmins";
import CRMMessageConstructor from "./pages/CRMMessageConstructor";
import CRMMessageLogs from "./pages/CRMMessageLogs";
import CRMTelegramProfiles from "./pages/CRMTelegramProfiles";
import NotFound from "./pages/NotFound";
import AdminExperts from "./pages/AdminExperts";
import SyncSourcesAdmin from "./pages/SyncSourcesAdmin";
import CRMBotLogs from "./pages/CRMBotLogs";
import GreenlandApp from "./pages/greenland/GreenlandApp";
import MarketplacePage from "./pages/MarketplacePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import GalleryPage from "./pages/GalleryPage";
import { AdminTablesPage } from "./pages/admin/AdminTablesPage";
import { AdminMarketPage } from "./pages/admin/AdminMarketPage";
import { AdminTriggersPage } from "./pages/admin/AdminTriggersPage";
import { AdminCronPage } from "./pages/admin/AdminCronPage";
import { AdminConsolePage } from "./pages/admin/AdminConsolePage";
import { AdminFilesPage } from "./pages/admin/AdminFilesPage";
import { AdminSAVCRMPage } from "./pages/admin/AdminSAVCRMPage";
import { AdminCRMDashboardPage } from "./pages/admin/AdminCRMDashboardPage";
import { AdminProxyPage } from "./pages/admin/AdminProxyPage";
import { AdminAutopilotPage } from "./pages/admin/AdminAutopilotPage";

import { preloadApplicationAssets, isSearchEngineBot } from "./utils/assetPreloader";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 800,
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const [isAppReady, setIsAppReady] = useState(() => isSearchEngineBot());
  const [bootProgress, setBootProgress] = useState(15);
  const [bootStatus, setBootStatus] = useState("Загрузка приложения...");

  // Synchronization flags to guarantee 3D model, background video/images, and preloader are all ready
  const [assetsPreloaded, setAssetsPreloaded] = useState(() => isSearchEngineBot());
  const [backgroundReady, setBackgroundReady] = useState(() => isSearchEngineBot());
  const [modelReady, setModelReady] = useState(() => isSearchEngineBot());

  useEffect(() => {
    // If SEO search engine bot, immediately show the full rendered page
    if (isSearchEngineBot()) {
      setIsAppReady(true);
      return;
    }

    let isMounted = true;
    preloadApplicationAssets(({ progress, status }) => {
      if (!isMounted) return;
      setBootProgress(progress);
      setBootStatus(status);
    }).then(() => {
      if (isMounted) {
        setAssetsPreloaded(true);
      }
    }).catch((preloadErr) => {
      console.warn('[App Assets Preload Note]', preloadErr);
      if (isMounted) {
        setAssetsPreloaded(true);
      }
    });

    // Fallback safety timeout (35s) to guarantee app shows even on heavily throttled networks
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setBootProgress(100);
        setBootStatus("Готово к работе!");
        setAssetsPreloaded(true);
        setBackgroundReady(true);
        setModelReady(true);
        setIsAppReady(true);
      }
    }, 35000);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  // Check if all essential visual layers are loaded before transitioning away from BootLoader
  useEffect(() => {
    if (isAppReady) return;
    if (assetsPreloaded && backgroundReady && modelReady) {
      setBootProgress(100);
      setBootStatus("Готово к работе!");
      const timer = setTimeout(() => {
        setIsAppReady(true);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [assetsPreloaded, backgroundReady, modelReady, isAppReady]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TelegramAuthProvider>
          <Toaster />
          <Sonner />
          <LinkEmailModal />
          
          {/* Preloader with 3D Neuron Sphere and Progress */}
          {!isAppReady && (
            <BootLoader bootProgress={bootProgress} bootStatus={bootStatus} />
          )}

          <BackgroundArtwork onReady={() => setBackgroundReady(true)} />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ModelBackground onModelLoaded={() => setModelReady(true)} />
            <div 
              className={`relative z-10 w-full min-h-screen transition-all duration-700 ease-out ${
                isAppReady ? 'opacity-100 filter-none' : 'opacity-0 blur-sm pointer-events-none'
              }`}
            >
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/marketplace" element={<MarketplacePage />} />
                  <Route path="/marketplace/:idOrSlug" element={<ProductDetailPage />} />
                  <Route path="/tproduct/:idOrSlug" element={<ProductDetailPage />} />
                  <Route path="/gallery" element={<GalleryPage />} />
                  <Route path="/admin/gallery" element={<GalleryPage />} />
                  <Route path="/profile" element={<Navigate to="/" replace />} />
                  <Route path="/profile/:telegramId" element={<Navigate to="/" replace />} />
                  <Route path="/ai-seller" element={<AISellerResult />} />
                  <Route path="/ai-seller/result" element={<AISellerResult />} />
                  <Route path="/ai-seller/plans" element={<AISellerPlans />} />
                  <Route path="/ai-seller/plan/:planLevel" element={<AISellerPlanDetails />} />
                  <Route path="/calculator" element={<CalculatorStep1 />} />
                  <Route path="/calculator/step1" element={<CalculatorStep1 />} />
                  <Route path="/calculator/step2" element={<CalculatorStep2 />} />
                  <Route path="/calculator/step3" element={<CalculatorStep3 />} />
                  <Route path="/calculator/step4" element={<CalculatorStep4 />} />
                  <Route path="/calculator/step5" element={<CalculatorStep5 />} />
                  <Route path="/calculator/step6" element={<CalculatorStep6 />} />
                  <Route path="/calculator/step7" element={<CalculatorStep7 />} />
                  <Route path="/calculator/step8" element={<CalculatorStep8 />} />
                  <Route path="/experts" element={<ExpertSelection />} />
                  <Route path="/experts/history" element={<ExpertHistory />} />
                  <Route path="/admin/crm" element={<AdminCRM />} />
                  <Route path="/admin/crm/dashboard" element={<CRMDashboard />} />
                  <Route path="/admin/crm/admins" element={<CRMAdmins />} />
                  <Route path="/admin/crm/messages" element={<CRMMessageConstructor />} />
                  <Route path="/admin/crm/logs" element={<CRMMessageLogs />} />
                  <Route path="/admin/crm/profiles" element={<CRMTelegramProfiles />} />
                  <Route path="/admin/crm/experts" element={<AdminExperts />} />
                  <Route path="/admin/crm/sync-sources" element={<SyncSourcesAdmin />} />
                  <Route path="/admin/crm/bot-logs" element={<CRMBotLogs />} />
                  <Route path="/system-admin" element={<AdminTablesPage />} />
                  <Route path="/system-admin/market" element={<AdminMarketPage />} />
                  <Route path="/system-admin/crm" element={<AdminSAVCRMPage />} />
                  <Route path="/system-admin/crm/dashboard" element={<AdminCRMDashboardPage />} />
                  <Route path="/system-admin/crm/messages" element={<Navigate to="/admin/crm/messages" replace />} />
                  <Route path="/system-admin/crm/logs" element={<Navigate to="/system-admin?table=sav_client_messages" replace />} />
                  <Route path="/system-admin/crm/profiles" element={<Navigate to="/system-admin?table=sav_telegram_profiles" replace />} />
                  <Route path="/system-admin/crm/experts" element={<Navigate to="/system-admin?table=experts" replace />} />
                  <Route path="/system-admin/crm/admins" element={<Navigate to="/system-admin?table=crm_admins" replace />} />
                  <Route path="/system-admin/greenland" element={<Navigate to="/greenland/admin" replace />} />
                  <Route path="/system-admin/calculations" element={<Navigate to="/system-admin?table=sav_user_calculations" replace />} />
                  <Route path="/system-admin/contracts" element={<Navigate to="/system-admin?table=contracts" replace />} />
                  <Route path="/system-admin/referrals" element={<Navigate to="/system-admin?table=partners" replace />} />
                  <Route path="/system-admin/autopilot" element={<AdminAutopilotPage />} />
                  <Route path="/system-admin/mailings" element={<Navigate to="/system-admin/autopilot" replace />} />
                  <Route path="/system-admin/proxy" element={<AdminProxyPage />} />
                  <Route path="/system-admin/triggers" element={<AdminTriggersPage />} />
                  <Route path="/system-admin/cron" element={<AdminCronPage />} />
                  <Route path="/system-admin/logs" element={<Navigate to="/system-admin?table=audit_logs" replace />} />
                  <Route path="/system-admin/console" element={<AdminConsolePage />} />
                  <Route path="/system-admin/files" element={<AdminFilesPage />} />
                  <Route path="/greenland/*" element={<GreenlandApp />} />
                  <Route path="/partner" element={<GreenlandApp />} />
                  <Route path="/partner/*" element={<GreenlandApp />} />
                  <Route path="/immigration" element={<GreenlandApp />} />
                  <Route path="/constitution" element={<GreenlandApp />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundary>
            </div>
          </BrowserRouter>
        </TelegramAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;