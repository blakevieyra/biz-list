-- Allow video uploads in the business-media bucket and raise the file size limit to 50 MB.
UPDATE storage.buckets
SET
  file_size_limit     = 52428800,
  allowed_mime_types  = ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'
  ]
WHERE id = 'business-media';
