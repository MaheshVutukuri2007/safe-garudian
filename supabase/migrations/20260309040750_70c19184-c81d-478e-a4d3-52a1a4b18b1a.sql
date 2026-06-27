
-- Trigger to enforce max JSONB data size (roughly 5MB) on datasets table
CREATE OR REPLACE FUNCTION public.check_dataset_size()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Limit data payload to ~5MB (5242880 bytes)
  IF octet_length(NEW.data::text) > 5242880 THEN
    RAISE EXCEPTION 'Dataset data payload exceeds 5MB limit';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_dataset_size
BEFORE INSERT OR UPDATE ON public.datasets
FOR EACH ROW
EXECUTE FUNCTION public.check_dataset_size();
