-- Profiles table for user display info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Firms table
CREATE TABLE public.firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  operating_hours_start TEXT NOT NULL DEFAULT '08:00',
  operating_hours_end TEXT NOT NULL DEFAULT '20:00',
  works_on_holidays BOOLEAN NOT NULL DEFAULT false,
  break_duration_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own firms" ON public.firms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own firms" ON public.firms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own firms" ON public.firms FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own firms" ON public.firms FOR DELETE USING (auth.uid() = user_id);

-- Positions table
CREATE TABLE public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  min_per_day INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own positions" ON public.positions FOR SELECT 
  USING (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));
CREATE POLICY "Users can create positions" ON public.positions FOR INSERT 
  WITH CHECK (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));
CREATE POLICY "Users can update positions" ON public.positions FOR UPDATE 
  USING (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete positions" ON public.positions FOR DELETE 
  USING (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));

-- Shifts table
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shifts" ON public.shifts FOR SELECT 
  USING (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));
CREATE POLICY "Users can create shifts" ON public.shifts FOR INSERT 
  WITH CHECK (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));
CREATE POLICY "Users can update shifts" ON public.shifts FOR UPDATE 
  USING (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete shifts" ON public.shifts FOR DELETE 
  USING (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));

-- Employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  egn TEXT NOT NULL,
  position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  contract_hours INTEGER NOT NULL DEFAULT 8,
  is_minor BOOLEAN NOT NULL DEFAULT false,
  birth_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own employees" ON public.employees FOR SELECT 
  USING (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));
CREATE POLICY "Users can create employees" ON public.employees FOR INSERT 
  WITH CHECK (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));
CREATE POLICY "Users can update employees" ON public.employees FOR UPDATE 
  USING (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete employees" ON public.employees FOR DELETE 
  USING (firm_id IN (SELECT id FROM public.firms WHERE user_id = auth.uid()));

-- Trigger function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_firms_updated_at
  BEFORE UPDATE ON public.firms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();