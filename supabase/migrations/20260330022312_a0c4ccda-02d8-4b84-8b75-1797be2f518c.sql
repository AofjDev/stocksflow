
-- Task statuses table (customizable like Trello columns)
CREATE TABLE public.task_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task statuses" ON public.task_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage task statuses" ON public.task_statuses FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default statuses
INSERT INTO public.task_statuses (name, color, sort_order) VALUES
  ('A Fazer', '#6b7280', 0),
  ('Em Andamento', '#f59e0b', 1),
  ('Concluído', '#10b981', 2);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status_id UUID REFERENCES public.task_statuses(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'media',
  assigned_to UUID,
  due_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Damages table
CREATE TABLE public.damages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scanned_code TEXT,
  sku TEXT,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  material_type TEXT NOT NULL DEFAULT 'PAV',
  responsible TEXT NOT NULL,
  damage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sold BOOLEAN NOT NULL DEFAULT false,
  order_number TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.damages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view damages" ON public.damages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create damages" ON public.damages FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update damages" ON public.damages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete damages" ON public.damages FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Damage photos table
CREATE TABLE public.damage_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  damage_id UUID NOT NULL REFERENCES public.damages(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.damage_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view damage photos" ON public.damage_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create damage photos" ON public.damage_photos FOR INSERT TO authenticated WITH CHECK (true);

-- Storage bucket for damage photos
INSERT INTO storage.buckets (id, name, public) VALUES ('damage-photos', 'damage-photos', true);

CREATE POLICY "Users can upload damage photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'damage-photos');
CREATE POLICY "Anyone can view damage photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'damage-photos');
