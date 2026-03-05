
-- Function for auto-updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Product categories enum
CREATE TYPE public.product_category AS ENUM ('placa_st', 'placa_ru', 'placa_rf', 'placa_fortissima', 'perfil_metalico', 'acessorio', 'massa', 'fita');

-- Unit of measure enum
CREATE TYPE public.unit_of_measure AS ENUM ('unidade', 'metro', 'metro_quadrado', 'pacote', 'caixa', 'kg', 'litro');

-- Movement type enum
CREATE TYPE public.movement_type AS ENUM ('entrada', 'saida', 'transferencia', 'ajuste', 'devolucao');

-- Non-conformity type enum
CREATE TYPE public.nonconformity_type AS ENUM ('divergencia_quantidade', 'produto_avariado', 'validade_vencida', 'produto_errado', 'fifo_violado', 'endereco_errado', 'outro');

-- Non-conformity status enum
CREATE TYPE public.nonconformity_status AS ENUM ('aberta', 'em_analise', 'resolvida', 'encerrada');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'operador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Products catalog
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category product_category NOT NULL,
  unit unit_of_measure NOT NULL DEFAULT 'unidade',
  weight_kg NUMERIC(10,3),
  dimensions TEXT,
  min_stock INTEGER NOT NULL DEFAULT 0,
  max_stock INTEGER NOT NULL DEFAULT 9999,
  shelf_life_days INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Warehouse locations (Area-Position)
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area TEXT NOT NULL,
  position TEXT NOT NULL,
  full_address TEXT GENERATED ALWAYS AS (area || '-' || position) STORED,
  capacity INTEGER NOT NULL DEFAULT 1,
  location_type TEXT NOT NULL DEFAULT 'pallet',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(area, position)
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view locations" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage locations" ON public.locations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Inventory (current stock with lot/batch tracking)
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) NOT NULL,
  location_id UUID REFERENCES public.locations(id) NOT NULL,
  lot_number TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  manufacturing_date DATE,
  expiry_date DATE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view inventory" ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage inventory" ON public.inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_inventory_product ON public.inventory(product_id);
CREATE INDEX idx_inventory_location ON public.inventory(location_id);
CREATE INDEX idx_inventory_expiry ON public.inventory(expiry_date);
CREATE INDEX idx_inventory_received ON public.inventory(received_at);

-- Stock movements
CREATE TABLE public.movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) NOT NULL,
  from_location_id UUID REFERENCES public.locations(id),
  to_location_id UUID REFERENCES public.locations(id),
  movement_type movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  lot_number TEXT,
  reference_doc TEXT,
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view movements" ON public.movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create movements" ON public.movements FOR INSERT TO authenticated WITH CHECK (auth.uid() = performed_by);

CREATE INDEX idx_movements_product ON public.movements(product_id);
CREATE INDEX idx_movements_created ON public.movements(created_at);

-- Non-conformities
CREATE TABLE public.nonconformities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type nonconformity_type NOT NULL,
  status nonconformity_status NOT NULL DEFAULT 'aberta',
  product_id UUID REFERENCES public.products(id),
  location_id UUID REFERENCES public.locations(id),
  lot_number TEXT,
  description TEXT NOT NULL,
  expected_value TEXT,
  actual_value TEXT,
  corrective_action TEXT,
  reported_by UUID REFERENCES auth.users(id) NOT NULL,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nonconformities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view nonconformities" ON public.nonconformities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create nonconformities" ON public.nonconformities FOR INSERT TO authenticated WITH CHECK (auth.uid() = reported_by);
CREATE POLICY "Authenticated users can update nonconformities" ON public.nonconformities FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER update_nonconformities_updated_at BEFORE UPDATE ON public.nonconformities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_nonconformities_status ON public.nonconformities(status);
CREATE INDEX idx_nonconformities_type ON public.nonconformities(type);

-- Seed initial products (Gypsum/Etex catalog)
INSERT INTO public.products (sku, name, description, category, unit, weight_kg, dimensions, shelf_life_days) VALUES
('GYP-ST-1200-12', 'Placa Standard 1200x2400x12.5mm', 'Placa de gesso para drywall - áreas secas', 'placa_st', 'unidade', 27.0, '1200x2400x12.5mm', 365),
('GYP-ST-1200-15', 'Placa Standard 1200x2400x15mm', 'Placa de gesso para drywall - áreas secas', 'placa_st', 'unidade', 33.0, '1200x2400x15mm', 365),
('GYP-RU-1200-12', 'Placa Resistente Umidade 1200x2400x12.5mm', 'Placa verde - áreas úmidas', 'placa_ru', 'unidade', 28.0, '1200x2400x12.5mm', 365),
('GYP-RU-1200-15', 'Placa Resistente Umidade 1200x2400x15mm', 'Placa verde - áreas úmidas', 'placa_ru', 'unidade', 34.0, '1200x2400x15mm', 365),
('GYP-RF-1200-12', 'Placa Resistente Fogo 1200x2400x12.5mm', 'Placa rosa - resistente ao fogo', 'placa_rf', 'unidade', 30.0, '1200x2400x12.5mm', 365),
('GYP-RF-1200-15', 'Placa Resistente Fogo 1200x2400x15mm', 'Placa rosa - resistente ao fogo', 'placa_rf', 'unidade', 36.0, '1200x2400x15mm', 365),
('GYP-FORT-1200-12', 'Placa Fortíssima 1200x2400x12.5mm', 'Placa alto desempenho mecânico', 'placa_fortissima', 'unidade', 32.0, '1200x2400x12.5mm', 365),
('GYP-MONT-48', 'Montante 48x40x3000mm', 'Perfil metálico montante', 'perfil_metalico', 'unidade', 1.8, '48x40x3000mm', NULL),
('GYP-MONT-70', 'Montante 70x40x3000mm', 'Perfil metálico montante', 'perfil_metalico', 'unidade', 2.2, '70x40x3000mm', NULL),
('GYP-GUIA-48', 'Guia 48x30x3000mm', 'Perfil metálico guia', 'perfil_metalico', 'unidade', 1.5, '48x30x3000mm', NULL),
('GYP-GUIA-70', 'Guia 70x30x3000mm', 'Perfil metálico guia', 'perfil_metalico', 'unidade', 1.9, '70x30x3000mm', NULL),
('GYP-CANT-25', 'Cantoneira 25x25x3000mm', 'Cantoneira metálica', 'acessorio', 'unidade', 0.8, '25x25x3000mm', NULL),
('GYP-PARAF-32', 'Parafuso Cabeça Trombeta 3.5x32mm', 'Parafuso para fixação de placas', 'acessorio', 'caixa', 2.5, '3.5x32mm', NULL),
('GYP-MASSA-JT', 'Massa para Juntas 28kg', 'Massa para tratamento de juntas', 'massa', 'unidade', 28.0, NULL, 180),
('GYP-FITA-PP', 'Fita de Papel Microperfurada 50mm', 'Fita para tratamento de juntas', 'fita', 'unidade', 0.3, '50mm x 75m', NULL);

-- Seed locations (Area-Position format)
INSERT INTO public.locations (area, position, capacity, location_type) VALUES
('A', '01', 20, 'pallet'), ('A', '02', 20, 'pallet'), ('A', '03', 20, 'pallet'), ('A', '04', 20, 'pallet'), ('A', '05', 20, 'pallet'),
('B', '01', 20, 'pallet'), ('B', '02', 20, 'pallet'), ('B', '03', 20, 'pallet'), ('B', '04', 20, 'pallet'), ('B', '05', 20, 'pallet'),
('C', '01', 15, 'estante'), ('C', '02', 15, 'estante'), ('C', '03', 15, 'estante'), ('C', '04', 15, 'estante'), ('C', '05', 15, 'estante'),
('D', '01', 30, 'blocado'), ('D', '02', 30, 'blocado'), ('D', '03', 30, 'blocado'),
('E', '01', 10, 'picking'), ('E', '02', 10, 'picking'), ('E', '03', 10, 'picking');
