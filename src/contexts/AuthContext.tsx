import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { getUserStorageKey } from "@/hooks/useUserStorage";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'cashier' | 'manager';
  business_name?: string | null;
  phone?: string | null;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: 'admin' | 'cashier' | 'manager') => boolean;
  isAdmin: () => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// One-time migration of legacy global localStorage keys to user-specific keys
const migrateLegacyData = (userId: string) => {
  const migrationKey = `migrated_${userId}`;
  if (localStorage.getItem(migrationKey)) return;

  console.log('AuthContext: Migrating legacy localStorage data for user', userId);
  const keysToMigrate = ['products', 'sales', 'customers', 'creditTransactions', 'lastSync', 'syncErrors', 'syncMetrics'];
  
  keysToMigrate.forEach(key => {
    const legacy = localStorage.getItem(key);
    const userKey = getUserStorageKey(key, userId);
    if (legacy && !localStorage.getItem(userKey)) {
      localStorage.setItem(userKey, legacy);
      console.log(`AuthContext: Migrated '${key}' to '${userKey}'`);
    }
  });

  // Clean up legacy keys after migration
  keysToMigrate.forEach(key => {
    localStorage.removeItem(key);
  });

  localStorage.setItem(migrationKey, 'true');
  console.log('AuthContext: Legacy data migration complete');
};

// Auto-pull from server on login to restore data
const autoPullFromServer = async (userId: string) => {
  try {
    const { productSync } = await import('@/services/sync/productSync');
    const { customerSync } = await import('@/services/sync/customerSync');
    const { creditTransactionSync } = await import('@/services/sync/creditTransactionSync');
    const { salesSync } = await import('@/services/sync/salesSync');

    const productsKey = getUserStorageKey('products', userId);
    const customersKey = getUserStorageKey('customers', userId);
    const creditTransactionsKey = getUserStorageKey('creditTransactions', userId);
    const salesKey = getUserStorageKey('sales', userId);

    // Only pull if local storage is empty for this user
    const hasLocalProducts = localStorage.getItem(productsKey);
    const hasLocalCustomers = localStorage.getItem(customersKey);
    const hasLocalCreditTransactions = localStorage.getItem(creditTransactionsKey);
    const hasLocalSales = localStorage.getItem(salesKey);

    if (!hasLocalProducts || JSON.parse(hasLocalProducts).length === 0) {
      console.log('AuthContext: Auto-pulling products from server...');
      const { products } = await productSync.pullProducts();
      if (products.length > 0) {
        localStorage.setItem(productsKey, JSON.stringify(products));
        console.log(`AuthContext: Pulled ${products.length} products from server`);
      }
    }

    if (!hasLocalCustomers || JSON.parse(hasLocalCustomers).length === 0) {
      console.log('AuthContext: Auto-pulling customers from server...');
      const { customers } = await customerSync.pullCustomers();
      if (customers.length > 0) {
        localStorage.setItem(customersKey, JSON.stringify(customers));
        console.log(`AuthContext: Pulled ${customers.length} customers from server`);
      }
    }

    if (!hasLocalCreditTransactions || JSON.parse(hasLocalCreditTransactions).length === 0) {
      console.log('AuthContext: Auto-pulling credit transactions from server...');
      const { transactions } = await creditTransactionSync.pullCreditTransactions();
      if (transactions.length > 0) {
        localStorage.setItem(creditTransactionsKey, JSON.stringify(transactions));
        console.log(`AuthContext: Pulled ${transactions.length} credit transactions from server`);
      }
    }

    if (!hasLocalSales || JSON.parse(hasLocalSales).length === 0) {
      console.log('AuthContext: Auto-pulling sales from server...');
      const { sales } = await salesSync.pullSales();
      if (sales.length > 0) {
        localStorage.setItem(salesKey, JSON.stringify(sales));
        console.log(`AuthContext: Pulled ${sales.length} sales from server`);
      }
    }

    // Notify components of data changes
    window.dispatchEvent(new Event('storage'));
  } catch (error) {
    console.error('AuthContext: Auto-pull from server failed:', error);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  const handleUserLogin = async (userId: string) => {
    // Step 1: Migrate legacy data
    migrateLegacyData(userId);
    // Step 2: Auto-pull from server (async, non-blocking)
    autoPullFromServer(userId);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(async () => {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
            setLoading(false);
            // Run migration + auto-pull on login
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              handleUserLogin(session.user.id);
            }
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
          setLoading(false);
          // Also run on initial session restore
          handleUserLogin(session.user.id);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (role: 'admin' | 'cashier' | 'manager'): boolean => {
    return profile?.role === role;
  };

  const isAdmin = (): boolean => {
    return profile?.role === 'admin';
  };

  const value: AuthContextType = {
    user, session, profile, loading,
    signIn, signUp, signOut, hasRole, isAdmin, refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
