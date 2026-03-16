
-- Allow admins to update movements
CREATE POLICY "Admins can update movements"
ON public.movements
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete movements
CREATE POLICY "Admins can delete movements"
ON public.movements
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
