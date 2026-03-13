
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Admins can manage statuses" ON public.inventory_statuses;
DROP POLICY IF EXISTS "Users can view statuses" ON public.inventory_statuses;

CREATE POLICY "Admins can manage statuses"
ON public.inventory_statuses
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view statuses"
ON public.inventory_statuses
FOR SELECT
TO authenticated
USING (true);
