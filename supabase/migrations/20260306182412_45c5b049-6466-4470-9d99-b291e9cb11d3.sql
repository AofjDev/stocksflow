
-- Create inventory_statuses table for custom statuses
CREATE TABLE public.inventory_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#6b7280',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_statuses ENABLE ROW LEVEL SECURITY;

-- Admins can CRUD
CREATE POLICY "Admins can manage statuses" ON public.inventory_statuses
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated can view
CREATE POLICY "Users can view statuses" ON public.inventory_statuses
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (true);

-- Add status_id to inventory
ALTER TABLE public.inventory ADD COLUMN status_id uuid REFERENCES public.inventory_statuses(id) ON DELETE SET NULL;

-- Seed default statuses
INSERT INTO public.inventory_statuses (name, color, sort_order) VALUES
  ('Carregando', '#f59e0b', 1),
  ('Bloqueado', '#ef4444', 2),
  ('FIFO 1', '#22c55e', 3),
  ('FIFO 2', '#3b82f6', 4),
  ('FIFO 3', '#8b5cf6', 5);
