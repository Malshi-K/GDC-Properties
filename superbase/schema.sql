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