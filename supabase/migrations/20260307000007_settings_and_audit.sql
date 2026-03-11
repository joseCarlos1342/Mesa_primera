-- Table for dynamic site config (like rules, general limits)
CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Anyone can read settings"
  ON site_settings FOR SELECT
  USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
  ON site_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );

-- Pre-populate default rulebook
INSERT INTO site_settings (id, value) VALUES 
('rulebook', '{"content": "# Reglamento Oficial\n\n1. El rake es del 5%.\n2. Cero tolerancia al colusion.\n3. Todo intento de fraude resultará en ban permanente."}')
ON CONFLICT (id) DO NOTHING;

-- Table for Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT, -- e.g. game_id, user_id
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can see audit logs
CREATE POLICY "Admins can see audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );
  
-- Admins can insert audit logs (via backend typically)
CREATE POLICY "Admins can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );
