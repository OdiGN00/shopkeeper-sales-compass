
import { useState, useEffect } from "react";
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isAfter, isBefore } from "date-fns";
import { Sale } from "@/types/sales";

import { SalesHistoryHeader } from "./sales-history/SalesHistoryHeader";
import { SalesHistoryFilters } from "./sales-history/SalesHistoryFilters";
import { SalesHistorySummaryCards } from "./sales-history/SalesHistorySummaryCards";
import { SalesListWithPagination } from "./sales-history/SalesListWithPagination";

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

  useEffect(() => {
    const loadSales = () => {
      const existingSales = JSON.parse(localStorage.getItem('sales') || '[]');
      setSales(existingSales.reverse());
    };

    loadSales();

    const handleStorageChange = () => {
      loadSales();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // --- Filtering ---
  let dateRange: { from: Date; to: Date } = (() => {
    const today = new Date();
    if (filterType === "week") {
      return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) };
    } else if (filterType === "month") {
      return { from: startOfMonth(today), to: endOfMonth(today) };
    } else if (filterType === "custom" && customRange.from && customRange.to) {
      return { from: customRange.from, to: customRange.to };
    } else {
      return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) };
    }
  })();

  const filteredSales = sales.filter((sale) => {
    const saleDate = new Date(sale.timestamp);
    return isAfter(saleDate, addDays(dateRange.from, -1)) && isBefore(saleDate, addDays(dateRange.to, 1));
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
