-- Create table to cache Overpass API bounding box queries
CREATE TABLE IF NOT EXISTS overpass_query_cache (
  bbox_query text PRIMARY KEY,
  response_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE overpass_query_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read overpass_query_cache" 
  ON overpass_query_cache FOR SELECT 
  USING (true);

-- Allow public insert access
CREATE POLICY "Public insert overpass_query_cache" 
  ON overpass_query_cache FOR INSERT 
  WITH CHECK (true);
