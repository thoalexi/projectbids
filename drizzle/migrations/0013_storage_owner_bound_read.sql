DROP POLICY "Anyone can view project photos" ON storage.objects;

CREATE POLICY "Public can view project and portfolio photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-photos'
    AND (storage.foldername(name))[2] IS DISTINCT FROM 'verification'
  );

CREATE POLICY "Users read own uploaded photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins read all photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-photos'
    AND public.has_role(auth.uid(), 'admin')
  );