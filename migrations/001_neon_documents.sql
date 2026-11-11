CREATE TABLE IF NOT EXISTS public.peladamas_documents (path text PRIMARY KEY, content text NOT NULL, version uuid NOT NULL DEFAULT gen_random_uuid(), updated_at timestamptz NOT NULL DEFAULT now());
