-- Create storage bucket for project contracts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-contracts', 'project-contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for contract uploads
CREATE POLICY "Authenticated users can upload contracts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'project-contracts' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view contracts"
ON storage.objects
FOR SELECT
USING (bucket_id = 'project-contracts');

CREATE POLICY "Users can update contracts"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'project-contracts'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete contracts"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'project-contracts'
  AND auth.uid() IS NOT NULL
);