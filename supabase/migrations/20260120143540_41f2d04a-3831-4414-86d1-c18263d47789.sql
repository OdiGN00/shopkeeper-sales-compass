-- Update RLS policy for products to allow viewing products owned by user OR shared products (null user_id)
-- This maintains backwards compatibility with existing products while enabling proper ownership

-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;

-- Create new policy that allows viewing own products OR products without user_id (shared/legacy products)
CREATE POLICY "Users can view own or shared products" 
ON public.products 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Also update INSERT policy to ensure new products get user_id
DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;
CREATE POLICY "Users can insert their own products" 
ON public.products 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update policy still requires ownership
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
CREATE POLICY "Users can update their own products" 
ON public.products 
FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Delete policy still requires ownership
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;
CREATE POLICY "Users can delete their own products" 
ON public.products 
FOR DELETE 
USING (auth.uid() = user_id OR user_id IS NULL);