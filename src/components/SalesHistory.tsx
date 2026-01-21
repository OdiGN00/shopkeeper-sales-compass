
import { useState, useEffect } from "react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { Sale } from "@/types/sales";

import { SalesHistoryHeader } from "./sales-history/SalesHistoryHeader";
import { SalesHistoryFilters } from "./sales-history/SalesHistoryFilters";
import { SalesHistorySummaryCards } from "./sales-history/SalesHistorySummaryCards";
import { SalesListWithPagination } from "./sales-history/SalesListWithPagination";
import { useUserStorage } from "@/hooks/useUserStorage";

interface SalesHistoryProps {
  onBack?: () => void;
}

type FilterType = "week" | "month" | "custom";
const SALES_PER_PAGE = 15;

export const SalesHistory = ({ onBack }: SalesHistoryProps) => {
  const [sales, setSales] = useState<(Sale & { id: number; synced: boolean })[]>([]);
  const [filterType, setFilterType] = useState<FilterType>("week");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const { getItem, userId } = useUserStorage();

  useEffect(() => {
    const loadSales = () => {
      if (userId) {
        const existingSales = getItem<(Sale & { id: number; synced: boolean })[]>('sales', []);
        setSales([...existingSales].reverse());
      }
    };

    loadSales();

    const handleStorageChange = () => {
      loadSales();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [userId, getItem]);

  // --- Filtering ---
  let dateRange: { from: Date; to: Date } = (() => {
    const today = new Date();
    if (filterType === "week") {
      return { 
        from: startOfDay(startOfWeek(today, { weekStartsOn: 1 })), 
        to: endOfDay(endOfWeek(today, { weekStartsOn: 1 })) 
      };
    } else if (filterType === "month") {
      return { 
        from: startOfDay(startOfMonth(today)), 
        to: endOfDay(endOfMonth(today)) 
      };
    } else if (filterType === "custom" && customRange.from && customRange.to) {
      return { 
        from: startOfDay(customRange.from), 
        to: endOfDay(customRange.to) 
      };
    } else {
      return { 
        from: startOfDay(startOfWeek(today, { weekStartsOn: 1 })), 
        to: endOfDay(endOfWeek(today, { weekStartsOn: 1 })) 
      };
    }
  })();

  const filteredSales = sales.filter((sale) => {
    const saleDate = new Date(sale.timestamp);
    return isWithinInterval(saleDate, { start: dateRange.from, end: dateRange.to });
  });

  const totalPages = Math.ceil(filteredSales.length / SALES_PER_PAGE);
  const paginatedSales = filteredSales.slice((currentPage - 1) * SALES_PER_PAGE, currentPage * SALES_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, customRange]);

  // Utility functions
  const getPaymentBadgeColor = (paymentType: string) => {
    switch (paymentType) {
      case 'cash':
        return 'bg-green-100 text-green-800';
      case 'mobile-money':
        return 'bg-blue-100 text-blue-800';
      case 'credit':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentLabel = (paymentType: string) => {
    switch (paymentType) {
      case 'cash':
        return 'Cash';
      case 'mobile-money':
        return 'Mobile Money';
      case 'credit':
        return 'Credit';
      default:
        return paymentType;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 space-y-6">
        <SalesHistoryHeader onBack={onBack} />

        <SalesHistoryFilters
          filterType={filterType}
          setFilterType={setFilterType}
          customRange={customRange}
          setCustomRange={setCustomRange}
          dateRange={dateRange}
          filteredLength={filteredSales.length}
        />

        <SalesHistorySummaryCards filteredSales={filteredSales} />

        <SalesListWithPagination
          paginatedSales={paginatedSales}
          filteredSalesLength={filteredSales.length}
          totalPages={totalPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          getPaymentBadgeColor={getPaymentBadgeColor}
          getPaymentLabel={getPaymentLabel}
        />
      </div>
    </div>
  );
};
