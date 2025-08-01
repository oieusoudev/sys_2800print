-- =====================================================
-- SCRIPT COMPLETO PARA CONFIGURAR O BANCO DE DADOS
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. CRIAR TABELA DE USUÁRIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  password_hash text NOT NULL,
  is_admin boolean DEFAULT false,
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para usuários
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text OR is_admin = true);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- 2. FUNÇÃO PARA ATUALIZAR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para users
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. CRIAR TABELA DE REGISTROS DE PONTO
-- =====================================================
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  clock_in time,
  lunch_out time,
  lunch_in time,
  clock_out time,
  notes text,
  total_hours numeric(5,2),
  regular_hours numeric(5,2),
  overtime_hours numeric(5,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraint para garantir apenas um registro por usuário por dia
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Política RLS para time_entries
CREATE POLICY "Users can access own time entries"
  ON time_entries
  FOR ALL
  TO authenticated
  USING (
    auth.uid()::text = user_id::text OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    auth.uid()::text = user_id::text OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.is_admin = true
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);

-- Trigger para time_entries
CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. CRIAR ENUM E TABELA DE LOCALIZAÇÕES
-- =====================================================
CREATE TYPE punch_type AS ENUM ('clock_in', 'lunch_out', 'lunch_in', 'clock_out');

CREATE TABLE IF NOT EXISTS punch_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
  punch_type punch_type NOT NULL,
  latitude numeric(10,8) NOT NULL,
  longitude numeric(11,8) NOT NULL,
  accuracy numeric(8,2) NOT NULL,
  address text,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE punch_locations ENABLE ROW LEVEL SECURITY;

-- Política RLS para punch_locations
CREATE POLICY "Users can access punch locations through time entries"
  ON punch_locations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM time_entries te
      JOIN users u ON te.user_id = u.id
      WHERE te.id = punch_locations.time_entry_id
      AND (
        u.id::text = auth.uid()::text OR
        EXISTS (
          SELECT 1 FROM users admin_user
          WHERE admin_user.id::text = auth.uid()::text
          AND admin_user.is_admin = true
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM time_entries te
      JOIN users u ON te.user_id = u.id
      WHERE te.id = punch_locations.time_entry_id
      AND (
        u.id::text = auth.uid()::text OR
        EXISTS (
          SELECT 1 FROM users admin_user
          WHERE admin_user.id::text = auth.uid()::text
          AND admin_user.is_admin = true
        )
      )
    )
  );

-- Índices para punch_locations
CREATE INDEX IF NOT EXISTS idx_punch_locations_time_entry ON punch_locations(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_punch_locations_punch_type ON punch_locations(punch_type);
CREATE INDEX IF NOT EXISTS idx_punch_locations_timestamp ON punch_locations(timestamp);

-- 5. CRIAR TABELA DE SESSÕES DE INTERVALO
-- =====================================================
CREATE TABLE IF NOT EXISTS break_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_time_used integer DEFAULT 0, -- em segundos
  sessions_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraint para garantir apenas uma sessão por usuário por dia
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE break_sessions ENABLE ROW LEVEL SECURITY;

-- Política RLS para break_sessions
CREATE POLICY "Users can access own break sessions"
  ON break_sessions
  FOR ALL
  TO authenticated
  USING (
    auth.uid()::text = user_id::text OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    auth.uid()::text = user_id::text OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.is_admin = true
    )
  );

-- Índices para break_sessions
CREATE INDEX IF NOT EXISTS idx_break_sessions_user_date ON break_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_break_sessions_date ON break_sessions(date);
CREATE INDEX IF NOT EXISTS idx_break_sessions_user_id ON break_sessions(user_id);

-- Trigger para break_sessions
CREATE TRIGGER update_break_sessions_updated_at
  BEFORE UPDATE ON break_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. CRIAR TABELA DE CREDENCIAIS WEBAUTHN
-- =====================================================
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id text UNIQUE NOT NULL,
  public_key text NOT NULL,
  counter integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- Política RLS para webauthn_credentials
CREATE POLICY "Users can access own webauthn credentials"
  ON webauthn_credentials
  FOR ALL
  TO authenticated
  USING (
    auth.uid()::text = user_id::text OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    auth.uid()::text = user_id::text OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.is_admin = true
    )
  );

-- Índices para webauthn_credentials
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id ON webauthn_credentials(credential_id);

-- 7. CRIAR TABELA DE CONFIGURAÇÕES DA EMPRESA
-- =====================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_hours numeric(4,2) DEFAULT 8.5,
  overtime_rate numeric(6,2) DEFAULT 7.00, -- €7 por hora
  break_limit_minutes integer DEFAULT 30,
  work_start_time time DEFAULT '09:30:00',
  work_end_time time DEFAULT '19:30:00',
  lunch_duration_minutes integer DEFAULT 90, -- 1h30min
  timezone text DEFAULT 'Europe/Lisbon',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para company_settings
CREATE POLICY "Authenticated users can read company settings"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify company settings"
  ON company_settings
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

-- Trigger para company_settings
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. CRIAR TABELA DE LOGS DE AUDITORIA
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address inet,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política RLS para audit_logs
CREATE POLICY "Only admins can access audit logs"
  ON audit_logs
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

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- 9. FUNÇÕES ÚTEIS
-- =====================================================

-- Função para criar log de auditoria
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id uuid,
  p_action text,
  p_details jsonb DEFAULT '{}',
  p_ip_address inet DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO audit_logs (user_id, action, details, ip_address)
  VALUES (p_user_id, p_action, p_details, p_ip_address)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular horas trabalhadas
CREATE OR REPLACE FUNCTION calculate_work_hours(
  p_clock_in time,
  p_clock_out time,
  p_lunch_duration_minutes integer DEFAULT 90
)
RETURNS TABLE(
  total_hours numeric,
  regular_hours numeric,
  overtime_hours numeric
) AS $$
DECLARE
  total_minutes integer;
  total_hours_calc numeric;
  regular_hours_calc numeric;
  overtime_hours_calc numeric;
  standard_hours numeric := 8.5;
BEGIN
  -- Se não há entrada ou saída, retornar zeros
  IF p_clock_in IS NULL OR p_clock_out IS NULL THEN
    RETURN QUERY SELECT 0::numeric, 0::numeric, 0::numeric;
    RETURN;
  END IF;
  
  -- Calcular minutos trabalhados
  total_minutes := EXTRACT(EPOCH FROM (p_clock_out - p_clock_in)) / 60;
  
  -- Se saída é antes da entrada, assumir que passou da meia-noite
  IF total_minutes < 0 THEN
    total_minutes := total_minutes + (24 * 60);
  END IF;
  
  -- Subtrair tempo de almoço obrigatório
  total_minutes := total_minutes - p_lunch_duration_minutes;
  
  -- Garantir que não seja negativo
  IF total_minutes < 0 THEN
    total_minutes := 0;
  END IF;
  
  -- Converter para horas
  total_hours_calc := total_minutes / 60.0;
  
  -- Calcular horas regulares e extras
  regular_hours_calc := LEAST(total_hours_calc, standard_hours);
  overtime_hours_calc := GREATEST(0, total_hours_calc - standard_hours);
  
  RETURN QUERY SELECT 
    ROUND(total_hours_calc, 2),
    ROUND(regular_hours_calc, 2),
    ROUND(overtime_hours_calc, 2);
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular horas automaticamente
CREATE OR REPLACE FUNCTION update_time_entry_hours()
RETURNS TRIGGER AS $$
DECLARE
  hours_result RECORD;
BEGIN
  -- Calcular horas se temos entrada e saída
  IF NEW.clock_in IS NOT NULL AND NEW.clock_out IS NOT NULL THEN
    SELECT * INTO hours_result 
    FROM calculate_work_hours(NEW.clock_in, NEW.clock_out);
    
    NEW.total_hours := hours_result.total_hours;
    NEW.regular_hours := hours_result.regular_hours;
    NEW.overtime_hours := hours_result.overtime_hours;
  ELSE
    NEW.total_hours := NULL;
    NEW.regular_hours := NULL;
    NEW.overtime_hours := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na tabela time_entries
CREATE TRIGGER calculate_hours_trigger
  BEFORE INSERT OR UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_time_entry_hours();

-- Função para obter estatísticas mensais
CREATE OR REPLACE FUNCTION get_monthly_stats(
  p_user_id uuid,
  p_year integer,
  p_month integer
)
RETURNS TABLE(
  total_hours numeric,
  regular_hours numeric,
  overtime_hours numeric,
  overtime_pay numeric,
  working_days integer,
  break_time_used integer
) AS $$
DECLARE
  start_date date;
  end_date date;
  overtime_rate numeric;
BEGIN
  -- Calcular período
  start_date := make_date(p_year, p_month, 1);
  end_date := (start_date + interval '1 month' - interval '1 day')::date;
  
  -- Obter taxa de hora extra
  SELECT cs.overtime_rate INTO overtime_rate 
  FROM company_settings cs 
  LIMIT 1;
  
  IF overtime_rate IS NULL THEN
    overtime_rate := 7.00; -- Valor padrão
  END IF;
  
  -- Calcular estatísticas
  SELECT 
    COALESCE(SUM(te.total_hours), 0),
    COALESCE(SUM(te.regular_hours), 0),
    COALESCE(SUM(te.overtime_hours), 0),
    COALESCE(SUM(te.overtime_hours), 0) * overtime_rate,
    COUNT(CASE WHEN te.clock_in IS NOT NULL AND te.clock_out IS NOT NULL THEN 1 END)::integer,
    COALESCE(SUM(bs.total_time_used), 0)::integer
  INTO 
    total_hours,
    regular_hours,
    overtime_hours,
    overtime_pay,
    working_days,
    break_time_used
  FROM time_entries te
  LEFT JOIN break_sessions bs ON bs.user_id = te.user_id AND bs.date = te.date
  WHERE te.user_id = p_user_id
    AND te.date >= start_date
    AND te.date <= end_date;
    
  RETURN QUERY SELECT 
    ROUND(total_hours, 2),
    ROUND(regular_hours, 2),
    ROUND(overtime_hours, 2),
    ROUND(overtime_pay, 2),
    working_days,
    break_time_used;
END;
$$ LANGUAGE plpgsql;

-- 10. INSERIR CONFIGURAÇÕES PADRÃO
-- =====================================================
INSERT INTO company_settings (
  daily_hours,
  overtime_rate,
  break_limit_minutes,
  work_start_time,
  work_end_time,
  lunch_duration_minutes,
  timezone
) 
SELECT 8.5, 7.00, 30, '09:30:00', '19:30:00', 90, 'Europe/Lisbon'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

-- 11. INSERIR USUÁRIOS DE TESTE
-- =====================================================
DO $$
BEGIN
  -- Usuário admin
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin') THEN
    INSERT INTO users (
      username,
      email,
      full_name,
      password_hash,
      is_admin,
      is_active
    ) VALUES (
      'admin',
      'admin@empresa.com',
      'Administrador do Sistema',
      'admin123', -- Em produção, usar hash bcrypt
      true,
      true
    );
  END IF;

  -- Usuário funcionário
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'funcionario') THEN
    INSERT INTO users (
      username,
      email,
      full_name,
      password_hash,
      is_admin,
      is_active
    ) VALUES (
      'funcionario',
      'funcionario@empresa.com',
      'João Silva',
      'funcionario123', -- Em produção, usar hash bcrypt
      false,
      true
    );
  END IF;
END $$;

-- =====================================================
-- SCRIPT CONCLUÍDO! 
-- Agora você pode testar o sistema com:
-- Admin: admin / admin123
-- Funcionário: funcionario / funcionario123
-- =====================================================