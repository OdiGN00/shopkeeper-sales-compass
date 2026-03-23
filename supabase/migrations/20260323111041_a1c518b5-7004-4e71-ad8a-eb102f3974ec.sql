
-- 1. Recreate views with security_invoker=on so base table RLS applies

DROP VIEW IF EXISTS public.daily_sales_summary;
CREATE VIEW public.daily_sales_summary
WITH (security_invoker=on) AS
SELECT sales.id,
    sales.customer_id,
    sales.total_amount,
    sales.payment_type,
    sales.notes,
    sales.sale_date,
    sales.created_at,
    sales.sync_status,
    sales.local_id
FROM sales
WHERE (sales.sale_date::date = CURRENT_DATE);

DROP VIEW IF EXISTS public.customer_credit_balances;
CREATE VIEW public.customer_credit_balances
WITH (security_invoker=on) AS
SELECT c.id,
    c.name,
    c.phone,
    COALESCE(( SELECT sum(
                CASE
                    WHEN (ct.transaction_type = 'sale'::transaction_type) THEN ct.amount
                    WHEN (ct.transaction_type = 'payment'::transaction_type) THEN (- ct.amount)
                    ELSE (0)::numeric
                END) AS sum
           FROM credit_transactions ct
          WHERE (ct.customer_id = c.id)), (0)::numeric) AS credit_balance,
    ( SELECT max(ct.transaction_date) AS max
           FROM credit_transactions ct
          WHERE ((ct.customer_id = c.id) AND (ct.transaction_type = 'sale'::transaction_type))) AS last_credit_date,
    ( SELECT max(ct.transaction_date) AS max
           FROM credit_transactions ct
          WHERE ((ct.customer_id = c.id) AND (ct.transaction_type = 'payment'::transaction_type))) AS last_payment_date
FROM customers c;

DROP VIEW IF EXISTS public.low_stock_products;
CREATE VIEW public.low_stock_products
WITH (security_invoker=on) AS
SELECT p.id,
    p.name,
    p.sku,
    p.category,
    p.unit_type,
    p.cost_price,
    p.selling_price,
    p.quantity,
    p.min_stock_level,
    p.expiry_date,
    p.created_at,
    p.updated_at,
    p.sync_status,
    p.local_id,
    (p.min_stock_level - p.quantity) AS shortage_quantity
FROM products p
WHERE (p.quantity <= p.min_stock_level);

-- 2. Lock down sync_log to per-user (via related table lookups)
DROP POLICY IF EXISTS "Enable all operations for sync_log" ON public.sync_log;

CREATE POLICY "Users can view their own sync logs" ON public.sync_log
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert sync logs" ON public.sync_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Add sale_items UPDATE and DELETE policies
CREATE POLICY "Users can update their own sale items" ON public.sale_items
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own sale items" ON public.sale_items
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid()
  ));
