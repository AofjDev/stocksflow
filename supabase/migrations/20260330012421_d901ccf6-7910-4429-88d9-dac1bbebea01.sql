
-- Counting tables for inventory counts
CREATE TABLE public.inventory_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_date date NOT NULL DEFAULT CURRENT_DATE,
  count_type text NOT NULL DEFAULT 'diario',
  performed_by uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.count_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id uuid NOT NULL REFERENCES public.inventory_counts(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  location_id uuid REFERENCES public.locations(id),
  quantity integer NOT NULL DEFAULT 0,
  sku text,
  scanned_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.count_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view counts" ON public.inventory_counts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create counts" ON public.inventory_counts FOR INSERT TO authenticated WITH CHECK (auth.uid() = performed_by);
CREATE POLICY "Admins can manage counts" ON public.inventory_counts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view count items" ON public.count_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create count items" ON public.count_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage count items" ON public.count_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete profiles (for rejecting users)
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
