
-- Add DELETE policy for nonconformities
CREATE POLICY "Admins can delete nonconformities"
ON public.nonconformities FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for products
CREATE POLICY "Admins can delete products"
ON public.products FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for locations  
CREATE POLICY "Admins can delete locations"
ON public.locations FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for inventory_counts
CREATE POLICY "Admins can delete counts"
ON public.inventory_counts FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for count_items
CREATE POLICY "Admins can delete count items"
ON public.count_items FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add UPDATE policy for nonconformities for all authenticated users
CREATE POLICY "Users can update nonconformities"
ON public.nonconformities FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Drop existing admin-only update policy for nonconformities
DROP POLICY IF EXISTS "Admins can update nonconformities" ON public.nonconformities;
