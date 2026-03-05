
CREATE TYPE public.damage_classification AS ENUM ('pav', 'if');

ALTER TABLE public.nonconformities 
ADD COLUMN damage_classification public.damage_classification NULL;
