-- Add budget and contract file fields to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS budget numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS contract_file_url text,
ADD COLUMN IF NOT EXISTS contract_file_name text;

-- Create chat_messages table for project chat
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for chat messages
CREATE POLICY "Users can view project chat messages"
ON public.chat_messages
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own messages"
ON public.chat_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;