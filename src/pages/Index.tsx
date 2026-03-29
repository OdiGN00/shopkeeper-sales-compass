import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { QuickSalesEntry } from "@/components/QuickSalesEntry";
import { InventorySnapshot } from "@/components/InventorySnapshot";
import { DailyReportSummary } from "@/components/DailyReportSummary";

import { NavigationTabs } from "@/components/NavigationTabs";
import { SalesHistory } from "@/components/SalesHistory";
import { ProductsManager } from "@/components/ProductsManager";
import { CustomersManager } from "@/components/CustomersManager";
import ReportsPage from "./ReportsPage";
import SettingsPage from "./SettingsPage";

const Index = () => {
  const [currentTab, setCurrentTab] = useState("dashboard");

  const renderCurrentView = () => {
    switch (currentTab) {
      case "sales":
        return <SalesHistory onBack={() => setCurrentTab("dashboard")} />;
      case "products":
        return <ProductsManager />;
      case "customers":
        return <CustomersManager />;
      case "reports":
        return <ReportsPage />;
      case "settings":
        return <SettingsPage />;
      case "dashboard":
      default:
        return (
          <>
            <DashboardHeader />
            <main className="pb-20 px-4 pt-4 space-y-6">
              {/* Quick Sales Entry */}
              <QuickSalesEntry />
              
              {/* Two-column layout for Inventory and Daily Report */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InventorySnapshot />
                <DailyReportSummary />
              </div>
              
              {/* Sync Status */}
              <SyncStatusWidget />
            </main>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderCurrentView()}
      
      {/* Bottom Navigation */}
      <NavigationTabs currentTab={currentTab} onTabChange={setCurrentTab} />
    </div>
  );
};

export default Index;
