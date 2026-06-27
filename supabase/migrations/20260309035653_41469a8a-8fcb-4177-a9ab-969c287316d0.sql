
-- Fix datasets policies: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Users can view own datasets" ON public.datasets;
DROP POLICY IF EXISTS "Users can insert own datasets" ON public.datasets;
DROP POLICY IF EXISTS "Users can delete own datasets" ON public.datasets;

CREATE POLICY "Users can view own datasets" ON public.datasets AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own datasets" ON public.datasets AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own datasets" ON public.datasets AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix predictions policies
DROP POLICY IF EXISTS "Users can view own predictions" ON public.predictions;
DROP POLICY IF EXISTS "Users can insert own predictions" ON public.predictions;
DROP POLICY IF EXISTS "Users can delete own predictions" ON public.predictions;

CREATE POLICY "Users can view own predictions" ON public.predictions AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own predictions" ON public.predictions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own predictions" ON public.predictions AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Fix alerts policies
DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can insert own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can delete own alerts" ON public.alerts;

CREATE POLICY "Users can view own alerts" ON public.alerts AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alerts" ON public.alerts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON public.alerts AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON public.alerts AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);
