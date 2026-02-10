-- Create project_files table for storing file links
CREATE TABLE public.project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  task_id UUID DEFAULT NULL,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Everyone can view project files
CREATE POLICY "Users can view all project files"
ON public.project_files
FOR SELECT
USING (true);

-- Users can insert their own files
CREATE POLICY "Users can insert own files"
ON public.project_files
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own files
CREATE POLICY "Users can update own files"
ON public.project_files
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can only delete their own files
CREATE POLICY "Users can delete own files"
ON public.project_files
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_project_files_updated_at
BEFORE UPDATE ON public.project_files
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();