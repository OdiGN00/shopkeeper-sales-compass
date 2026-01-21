import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";

/**
 * Hook for user-specific localStorage operations.
 * All data is stored with user-specific keys to ensure data isolation between users.
 */
export const useUserStorage = () => {
  const { user } = useAuth();

  const getUserKey = useCallback((baseKey: string): string => {
    if (!user?.id) {
      console.warn('useUserStorage: No user ID available, using global key');
      return baseKey;
    }
    return `${baseKey}_${user.id}`;
  }, [user?.id]);

  const getItem = useCallback(<T>(key: string, defaultValue: T): T => {
    try {
      const userKey = getUserKey(key);
      const item = localStorage.getItem(userKey);
      if (item) {
        return JSON.parse(item);
      }
      return defaultValue;
    } catch (error) {
      console.error(`Error reading ${key} from storage:`, error);
      return defaultValue;
    }
  }, [getUserKey]);

  const setItem = useCallback(<T>(key: string, value: T): void => {
    try {
      const userKey = getUserKey(key);
      localStorage.setItem(userKey, JSON.stringify(value));
      // Dispatch storage event to notify other components
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error(`Error writing ${key} to storage:`, error);
    }
  }, [getUserKey]);

  const removeItem = useCallback((key: string): void => {
    try {
      const userKey = getUserKey(key);
      localStorage.removeItem(userKey);
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
    }
  }, [getUserKey]);

  return {
    getUserKey,
    getItem,
    setItem,
    removeItem,
    userId: user?.id
  };
};

/**
 * Utility function to get user-specific key for use in services.
 * This is for use outside of React components.
 */
export const getUserStorageKey = (baseKey: string, userId: string | undefined): string => {
  if (!userId) {
    console.warn('getUserStorageKey: No user ID provided, using global key');
    return baseKey;
  }
  return `${baseKey}_${userId}`;
};
