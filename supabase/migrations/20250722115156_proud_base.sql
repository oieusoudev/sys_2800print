/*
  # Adicionar Sistema de Avisos e Notificações

  1. New Tables
    - `announcements`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references users)
      - `recipient_id` (uuid, nullable for general announcements)
      - `title` (text)
      - `message` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `user_announcements`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `announcement_id` (uuid, references announcements)
      - `read_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add appropriate policies for admins and users
*/

-- 1. CRIAR TABELA DE AVISOS (ANNOUNCEMENTS)
-- =====================================================
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES users(id) ON DELETE CASCADE, -- NULL para avisos gerais
  title text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para announcements
CREATE POLICY "Admins can manage all announcements"
  ON announcements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.is_admin = true
    )
  );

CREATE POLICY "Users can read their own or general announcements"
  ON announcements
  FOR SELECT
  TO authenticated
  USING (
    recipient_id IS NULL OR 
    recipient_id::text = auth.uid()::text
  );

-- Trigger para announcements
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para announcements
CREATE INDEX IF NOT EXISTS idx_announcements_recipient_id ON announcements(recipient_id);
CREATE INDEX IF NOT EXISTS idx_announcements_sender_id ON announcements(sender_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);

-- 2. CRIAR TABELA DE STATUS DE LEITURA (USER_ANNOUNCEMENTS)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, announcement_id)
);

-- Enable RLS
ALTER TABLE user_announcements ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_announcements
CREATE POLICY "Admins can manage all user announcement statuses"
  ON user_announcements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.is_admin = true
    )
  );

CREATE POLICY "Users can read and update their own announcement statuses"
  ON user_announcements
  FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- Trigger para user_announcements
CREATE TRIGGER update_user_announcements_updated_at
  BEFORE UPDATE ON user_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para user_announcements
CREATE INDEX IF NOT EXISTS idx_user_announcements_user_id ON user_announcements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_announcements_announcement_id ON user_announcements(announcement_id);
CREATE INDEX IF NOT EXISTS idx_user_announcements_read_at ON user_announcements(read_at);

-- 3. FUNÇÃO PARA ENVIAR AVISO GERAL
-- =====================================================
CREATE OR REPLACE FUNCTION send_general_announcement(
  p_sender_id uuid,
  p_title text,
  p_message text
)
RETURNS uuid AS $$
DECLARE
  announcement_id uuid;
  user_record RECORD;
BEGIN
  -- Verificar se o remetente é admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_sender_id AND is_admin = true AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only admins can send general announcements';
  END IF;

  -- Criar o aviso
  INSERT INTO announcements (sender_id, recipient_id, title, message)
  VALUES (p_sender_id, NULL, p_title, p_message)
  RETURNING id INTO announcement_id;

  -- Criar entradas para todos os usuários não-admin ativos
  FOR user_record IN 
    SELECT id FROM users 
    WHERE is_admin = false AND is_active = true
  LOOP
    INSERT INTO user_announcements (user_id, announcement_id)
    VALUES (user_record.id, announcement_id);
  END LOOP;

  RETURN announcement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNÇÃO PARA ENVIAR AVISO ESPECÍFICO
-- =====================================================
CREATE OR REPLACE FUNCTION send_specific_announcement(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_title text,
  p_message text
)
RETURNS uuid AS $$
DECLARE
  announcement_id uuid;
BEGIN
  -- Verificar se o remetente é admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_sender_id AND is_admin = true AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only admins can send announcements';
  END IF;

  -- Verificar se o destinatário existe e não é admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_recipient_id AND is_admin = false AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid recipient';
  END IF;

  -- Criar o aviso
  INSERT INTO announcements (sender_id, recipient_id, title, message)
  VALUES (p_sender_id, p_recipient_id, p_title, p_message)
  RETURNING id INTO announcement_id;

  -- Criar entrada para o usuário específico
  INSERT INTO user_announcements (user_id, announcement_id)
  VALUES (p_recipient_id, announcement_id);

  RETURN announcement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNÇÃO PARA OBTER AVISOS NÃO LIDOS
-- =====================================================
CREATE OR REPLACE FUNCTION get_unread_announcements_count(p_user_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM user_announcements ua
    WHERE ua.user_id = p_user_id 
    AND ua.read_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;