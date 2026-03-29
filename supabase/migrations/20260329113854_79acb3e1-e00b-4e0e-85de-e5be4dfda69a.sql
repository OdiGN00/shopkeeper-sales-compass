
-- Fix 1: Recreate views with auth.uid() filtering
DROP VIEW IF EXISTS public.customer_credit_balances;
DROP VIEW IF EXISTS public.low_stock_products;
DROP VIEW IF EXISTS public.daily_sales_summary;

CREATE VIEW public.customer_credit_balances WITH (security_invoker = on) AS
SELECT c.id, c.name, c.phone,
  COALESCE((SELECT SUM(CASE
    WHEN ct.transaction_type = 'sale' THEN ct.amount
    WHEN ct.transaction_type = 'payment' THEN -ct.amount
    ELSE 0 END)
  FROM credit_transactions ct WHERE ct.customer_id = c.id), 0) AS credit_balance,
  (SELECT MAX(ct.transaction_date) FROM credit_transactions ct
   WHERE ct.customer_id = c.id AND ct.transaction_type = 'sale') AS last_credit_date,
  (SELECT MAX(ct.transaction_date) FROM credit_transactions ct
   WHERE ct.customer_id = c.id AND ct.transaction_type = 'payment') AS last_payment_date
FROM customers c WHERE c.user_id = auth.uid();

CREATE VIEW public.low_stock_products WITH (security_invoker = on) AS
SELECT p.id, p.name, p.sku, p.category, p.cost_price, p.selling_price,
  p.quantity, p.min_stock_level, p.unit_type, p.expiry_date,
  p.created_at, p.updated_at, p.sync_status, p.local_id,
  (p.min_stock_level - p.quantity) AS shortage_quantity
FROM products p WHERE p.quantity <= p.min_stock_level AND p.user_id = auth.uid();

CREATE VIEW public.daily_sales_summary WITH (security_invoker = on) AS
SELECT s.id, s.customer_id, s.total_amount, s.payment_type, s.sale_date,
  s.created_at, s.sync_status, s.notes, s.local_id
FROM sales s WHERE s.user_id = auth.uid();

-- Fix 2: Fix audit_trail INSERT policy to require authentication
DROP POLICY IF EXISTS "System can insert audit records" ON public.audit_trail;
CREATE POLICY "System can insert audit records"
  ON public.audit_trail FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix 3: Add user_id to sync_log and fix policies
ALTER TABLE public.sync_log ADD COLUMN IF NOT EXISTS user_id UUID;

DROP POLICY IF EXISTS "Users can view their own sync logs" ON public.sync_log;
DROP POLICY IF EXISTS "Users can insert sync logs" ON public.sync_log;

CREATE POLICY "Users see own sync logs"
  ON public.sync_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own sync logs"
  ON public.sync_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fix 4: Fix log_sync_change to set search_path and include user_id
CREATE OR REPLACE FUNCTION public.log_sync_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    record_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        record_id := OLD.id;
    ELSE
        record_id := NEW.id;
    END IF;

    INSERT INTO public.sync_log (
        table_name,
        record_id,
        operation,
        sync_status,
        user_id,
        created_at
    ) VALUES (
        TG_TABLE_NAME,
        record_id,
        TG_OP,
        'pending',
        auth.uid(),
        NOW()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$;
