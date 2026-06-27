
-- Add UPDATE policy for datasets table
CREATE POLICY "Users can update own datasets" ON public.datasets
AS PERMISSIVE FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add server-side row count limit
ALTER TABLE public.datasets ADD CONSTRAINT max_row_count CHECK (row_count <= 100000);

-- Add server-side column count limit
ALTER TABLE public.datasets ADD CONSTRAINT max_column_count CHECK (column_count <= 200);
