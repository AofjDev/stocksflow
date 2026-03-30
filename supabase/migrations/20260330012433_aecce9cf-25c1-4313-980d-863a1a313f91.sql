
-- Fix: restrict count_items insert to users who own the parent count
DROP POLICY "Users can create count items" ON public.count_items;
CREATE POLICY "Users can create count items" ON public.count_items FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.inventory_counts ic 
    WHERE ic.id = count_id AND ic.performed_by = auth.uid()
  )
);
