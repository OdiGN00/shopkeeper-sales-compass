
-- Task 1: Fix products RLS - remove NULL user_id visibility

-- Remove duplicate INSERT policy
DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;

-- Fix SELECT: strict user_id only
DROP POLICY IF EXISTS "Users can view own or shared products" ON public.products;
CREATE POLICY "Users can view their own products" ON public.products
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Fix UPDATE: strict user_id only
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
CREATE POLICY "Users can update their own products" ON public.products
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Fix DELETE: strict user_id only
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;
CREATE POLICY "Users can delete their own products" ON public.products
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
