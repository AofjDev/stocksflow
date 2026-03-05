
-- Add approved column to profiles
ALTER TABLE public.profiles ADD COLUMN approved BOOLEAN NOT NULL DEFAULT false;

-- Add is_admin column to profiles  
ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Update the first user to be admin (you'll set this manually or we auto-approve first user)
-- We'll handle first-user-is-admin logic in the app
