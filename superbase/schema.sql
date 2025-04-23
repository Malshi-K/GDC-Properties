-- Create profiles table with role field
CREATE TABLE profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  preferences TEXT,
  role TEXT NOT NULL DEFAULT 'user', -- 'user' or 'owner'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS) for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view and edit only their own profile
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create properties table
CREATE TABLE properties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  price_period TEXT, -- e.g., 'month', 'week', etc.
  bedrooms INTEGER,
  bathrooms INTEGER,
  square_footage INTEGER,
  location TEXT NOT NULL,
  main_image_url TEXT,
  available_from DATE,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security for properties
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Create policy to allow owners to manage only their own properties
CREATE POLICY "Owners can manage their own properties" ON properties
  FOR ALL USING (auth.uid() = owner_id);

-- Create policy to allow all users to view properties
CREATE POLICY "All users can view properties" ON properties
  FOR SELECT USING (true);

-- Create favorites table (for saved properties)
CREATE TABLE favorites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  property_id UUID REFERENCES properties NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- Set up Row Level Security for favorites
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view and manage only their own favorites
CREATE POLICY "Users can view their own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Create viewing_requests table
CREATE TABLE viewing_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  proposed_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'declined'
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security for viewing_requests
ALTER TABLE viewing_requests ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view and manage their own viewing requests
CREATE POLICY "Users can view their own viewing requests" ON viewing_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own viewing requests" ON viewing_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow property owners to view and update viewing requests for their properties
CREATE POLICY "Owners can view and update viewing requests for their properties" ON viewing_requests
  FOR ALL USING (
    auth.uid() IN (
      SELECT owner_id FROM properties WHERE id = property_id
    )
  );

-- Create rental_applications table
CREATE TABLE rental_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  message TEXT,
  employment_status TEXT,
  income NUMERIC,
  credit_score TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security for rental_applications
ALTER TABLE rental_applications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view and manage their own rental applications
CREATE POLICY "Users can view their own rental applications" ON rental_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rental applications" ON rental_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow property owners to view and update rental applications for their properties
CREATE POLICY "Owners can view and update rental applications for their properties" ON rental_applications
  FOR ALL USING (
    auth.uid() IN (
      SELECT owner_id FROM properties WHERE id = property_id
    )
  );

-- Update the trigger function to include the role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'role', 'user'),
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = user_id;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROPERTIES TABLE
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    price NUMERIC NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms NUMERIC NOT NULL,
    square_footage INTEGER,
    property_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    available_from DATE,
    amenities TEXT[] DEFAULT '{}',
    images TEXT[] DEFAULT '{}',
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for property queries by owner
CREATE INDEX IF NOT EXISTS properties_owner_id_idx ON public.properties(owner_id);

-- Viewing Requests Table
CREATE TABLE IF NOT EXISTS public.viewing_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    proposed_date TIMESTAMP WITH TIME ZONE NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, declined
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for viewing_requests
CREATE INDEX IF NOT EXISTS viewing_requests_property_id_idx ON public.viewing_requests(property_id);
CREATE INDEX IF NOT EXISTS viewing_requests_user_id_idx ON public.viewing_requests(user_id);

-- Rental Applications Table
CREATE TABLE IF NOT EXISTS public.rental_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT,
    employment_status TEXT,
    income NUMERIC,
    credit_score TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for rental_applications
CREATE INDEX IF NOT EXISTS rental_applications_property_id_idx ON public.rental_applications(property_id);
CREATE INDEX IF NOT EXISTS rental_applications_user_id_idx ON public.rental_applications(user_id);

-- Row Level Security (RLS) Policies

-- Properties RLS
-- Enable RLS on properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Allow owners to see only their properties
CREATE POLICY owner_properties_policy ON public.properties
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Allow all authenticated users to read all available properties
CREATE POLICY read_available_properties ON public.properties
    FOR SELECT
    USING (status = 'available' OR owner_id = auth.uid());

-- Viewing Requests RLS
-- Enable RLS on viewing_requests
ALTER TABLE public.viewing_requests ENABLE ROW LEVEL SECURITY;

-- Property owners can see requests for their properties
CREATE POLICY owner_view_requests ON public.viewing_requests
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.properties 
        WHERE properties.id = viewing_requests.property_id AND properties.owner_id = auth.uid()
    ));

-- Property owners can update requests for their properties
CREATE POLICY owner_update_requests ON public.viewing_requests
    FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.properties 
        WHERE properties.id = viewing_requests.property_id AND properties.owner_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.properties 
        WHERE properties.id = viewing_requests.property_id AND properties.owner_id = auth.uid()
    ));

-- Users can see their own viewing requests
CREATE POLICY user_view_own_requests ON public.viewing_requests
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own viewing requests
CREATE POLICY user_insert_requests ON public.viewing_requests
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Rental Applications RLS
-- Enable RLS on rental_applications
ALTER TABLE public.rental_applications ENABLE ROW LEVEL SECURITY;

-- Property owners can see applications for their properties
CREATE POLICY owner_view_applications ON public.rental_applications
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.properties 
        WHERE properties.id = rental_applications.property_id AND properties.owner_id = auth.uid()
    ));

-- Property owners can update applications for their properties
CREATE POLICY owner_update_applications ON public.rental_applications
    FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.properties 
        WHERE properties.id = rental_applications.property_id AND properties.owner_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.properties 
        WHERE properties.id = rental_applications.property_id AND properties.owner_id = auth.uid()
    ));

-- Users can see their own rental applications
CREATE POLICY user_view_own_applications ON public.rental_applications
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own rental applications
CREATE POLICY user_insert_applications ON public.rental_applications
    FOR INSERT
    WITH CHECK (user_id = auth.uid());