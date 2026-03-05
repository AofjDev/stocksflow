-- Endurecer políticas RLS e remover condições permissivas (true)

-- inventory
DROP POLICY IF EXISTS "Authenticated users can manage inventory" ON public.inventory;
DROP POLICY IF EXISTS "Authenticated users can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Admins can manage inventory" ON public.inventory;

CREATE POLICY "Users can view inventory"
ON public.inventory
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage inventory"
ON public.inventory
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- locations
DROP POLICY IF EXISTS "Authenticated users can manage locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated users can view locations" ON public.locations;
DROP POLICY IF EXISTS "Users can view locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can manage locations" ON public.locations;

CREATE POLICY "Users can view locations"
ON public.locations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage locations"
ON public.locations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- products
DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Users can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

CREATE POLICY "Users can view products"
ON public.products
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- nonconformities
DROP POLICY IF EXISTS "Authenticated users can create nonconformities" ON public.nonconformities;
DROP POLICY IF EXISTS "Authenticated users can update nonconformities" ON public.nonconformities;
DROP POLICY IF EXISTS "Authenticated users can view nonconformities" ON public.nonconformities;
DROP POLICY IF EXISTS "Users can create nonconformities" ON public.nonconformities;
DROP POLICY IF EXISTS "Users can view nonconformities" ON public.nonconformities;
DROP POLICY IF EXISTS "Admins can update nonconformities" ON public.nonconformities;

CREATE POLICY "Users can view nonconformities"
ON public.nonconformities
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create nonconformities"
ON public.nonconformities
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Admins can update nonconformities"
ON public.nonconformities
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- profiles (corrigir with_check=true)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));