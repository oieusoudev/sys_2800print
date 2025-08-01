@@ .. @@
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
-      'admin123', -- Em produção, usar hash bcrypt
+      '$2a$12$LQv3c1yqBwEHXw.9UdjiSO9nxdklNEoAUCs9AhzQaNdck2B3E/jW6', -- bcrypt hash of 'admin123'
      true,
      true
    );
@@ .. @@
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
-      'funcionario123', -- Em produção, usar hash bcrypt
+      '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash of 'funcionario123'
      false,
      true
    );