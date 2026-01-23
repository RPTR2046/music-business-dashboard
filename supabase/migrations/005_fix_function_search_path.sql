-- Fix function search_path security issues
-- Setting search_path to '' prevents search_path injection attacks

-- Fix validate_contributor_splits function
CREATE OR REPLACE FUNCTION public.validate_contributor_splits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  total_share DECIMAL(5,2);
BEGIN
  -- Calculate total share for the song
  SELECT COALESCE(SUM(share_percentage), 0) INTO total_share
  FROM public.song_contributors
  WHERE song_id = NEW.song_id AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  total_share := total_share + NEW.share_percentage;

  -- Check if total exceeds 100%
  IF total_share > 100 THEN
    RAISE EXCEPTION 'Total contributor shares cannot exceed 100%%. Current total would be: %', total_share;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
