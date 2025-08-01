# 📋 Sistema de Folha de Ponto

Sistema completo de controle de ponto para empresas, desenvolvido com Next.js, Supabase e autenticação biométrica.

## 🚀 Funcionalidades

### ⏰ **Controle de Ponto**
- Registro de entrada, saída para almoço, volta do almoço e saída
- Geolocalização obrigatória para todos os registros
- Cálculo automático de horas trabalhadas e extras
- Observações diárias

### 🍽️ **Gestão de Intervalos**
- Timer de intervalo diário (30 minutos)
- Controle de pausa/retomada
- Notificações de tempo esgotado
- Reset automático diário

### 🔐 **Autenticação Avançada**
- Login tradicional (usuário/senha)
- Autenticação biométrica (Face ID/Touch ID)
- WebAuthn para máxima segurança
- Gestão de credenciais

### 📊 **Relatórios e Estatísticas**
- Histórico mensal completo
- Exportação para CSV
- Cálculo de horas extras
- Estatísticas detalhadas

### 🗺️ **Geolocalização**
- Localização precisa para cada ponto
- Endereços automáticos via OpenStreetMap
- Visualização no Google Maps
- Controle de precisão

## 🛠️ Tecnologias

- **Frontend**: Next.js 13, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Autenticação**: Supabase Auth + WebAuthn
- **UI**: shadcn/ui, Lucide Icons
- **Mapas**: Google Maps, OpenStreetMap

## 📦 Instalação

### 1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd folha-de-ponto
```

### 2. **Instale as dependências**
```bash
npm install
```

### 3. **Configure as variáveis de ambiente**
```bash
# Copie o arquivo de exemplo
cp .env.example .env.local

# Edite o arquivo .env.local com suas configurações
```

### 4. **Configure o Supabase**

#### 4.1. Crie um projeto no [Supabase](https://supabase.com)

#### 4.2. Configure as variáveis de ambiente:

**PASSO A PASSO DETALHADO:**

1. **Acesse seu projeto Supabase** em [https://supabase.com/dashboard](https://supabase.com/dashboard)

2. **Vá para Settings > API** no menu lateral

3. **Copie as seguintes informações:**
   - **Project URL**: Copie a URL completa (ex: `https://abcdefgh.supabase.co`)
   - **anon public**: Copie a chave `anon` (começa com `eyJhbGciOiJIUzI1NiI...`)
   - **service_role**: Copie a chave `service_role` (começa com `eyJhbGciOiJIUzI1NiI...`)

4. **Abra o arquivo `.env.local`** na raiz do projeto

5. **Substitua os valores:**
   ```bash
   # Substitua pela sua URL do projeto
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-id.supabase.co
   
   # Substitua pela sua chave anon
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...sua-chave-anon
   
   # Substitua pela sua chave service_role
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiI...sua-chave-service-role
   ```

6. **⚠️ IMPORTANTE**: Após alterar o `.env.local`, **REINICIE o servidor**:
   ```bash
   # Pare o servidor (Ctrl+C) e execute novamente:
   npm run dev
   ```

#### 4.3. Execute o script SQL:
No SQL Editor do Supabase, execute o conteúdo do arquivo:
```
supabase/migrations/20250718164200_crystal_mouse.sql
```

#### 4.4. Configure as Edge Functions (opcional):
```bash
# Se tiver o Supabase CLI instalado
supabase functions deploy
```

### 5. **Execute o projeto**
```bash
npm run dev
```

Acesse: http://localhost:3000

## 👥 Usuários de Teste

O sistema vem com usuários pré-configurados:

### **Administrador**
- **Usuário**: `admin`
- **Senha**: `admin123`
- **Permissões**: Acesso total ao sistema

### **Funcionário**
- **Usuário**: `funcionario`
- **Senha**: `funcionario123`
- **Permissões**: Registro de ponto e relatórios próprios

## 🏗️ Estrutura do Projeto

```
├── app/                    # Páginas Next.js 13
│   ├── api/               # API Routes (fallback)
│   ├── auth/              # Páginas de autenticação
│   └── dashboard/         # Dashboard principal
├── components/            # Componentes React
│   ├── ui/               # Componentes base (shadcn/ui)
│   └── dashboard/        # Componentes específicos
├── hooks/                # Custom hooks
├── lib/                  # Utilitários e configurações
├── services/             # Serviços de API
├── supabase/             # Configurações Supabase
│   ├── functions/        # Edge Functions
│   └── migrations/       # Migrações SQL
├── types/                # Definições TypeScript
└── utils/                # Funções utilitárias
```

## 🔧 Configuração Avançada

### **WebAuthn (Biometria)**
Para funcionar em produção, certifique-se de:
- Usar HTTPS
- Configurar domínio correto
- Testar em dispositivos reais

### **Geolocalização**
- Funciona melhor em HTTPS
- Requer permissão do usuário
- Precisão varia por dispositivo

### **Edge Functions**
- Deploy automático via Supabase CLI
- Fallback para API Routes se falharem
- Logs disponíveis no dashboard Supabase

## 📱 Uso do Sistema

### **1. Primeiro Acesso**
1. Acesse o sistema
2. Faça login com usuário de teste
3. Permita acesso à localização
4. Configure biometria (opcional)

### **2. Registro de Ponto**
1. Aguarde localização precisa
2. Clique no botão do ponto desejado
3. Confirme a localização
4. Adicione observações se necessário

### **3. Gestão de Intervalos**
1. Inicie o timer de intervalo
2. Pause/retome conforme necessário
3. Monitore tempo restante
4. Sistema reseta automaticamente

### **4. Relatórios**
1. Visualize histórico na tabela
2. Exporte dados para CSV
3. Analise estatísticas mensais
4. Verifique localizações dos pontos

## 🚀 Deploy

### **Vercel (Recomendado)**
```bash
# Instale a CLI da Vercel
npm i -g vercel

# Deploy
vercel

# Configure as variáveis de ambiente no dashboard
```

### **Netlify**
```bash
# Build do projeto
npm run build

# Upload da pasta .next para Netlify
```

### **Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔒 Segurança

- ✅ Row Level Security (RLS) no Supabase
- ✅ Autenticação JWT
- ✅ WebAuthn para biometria
- ✅ Validação de dados
- ✅ Rate limiting nas Edge Functions
- ✅ Logs de auditoria

## 🐛 Troubleshooting

### **Problemas Comuns**

#### **Geolocalização não funciona**
- Verifique se está em HTTPS
- Confirme permissões do navegador
- Teste em dispositivo real

#### **Biometria não disponível**
- Verifique suporte do dispositivo
- Confirme HTTPS
- Teste em navegador compatível

#### **Edge Functions falham**
- Sistema usa API Routes como fallback
- Verifique logs no Supabase
- Confirme configuração das variáveis

#### **Erro de CORS**
- Verifique configuração do Supabase
- Confirme URLs nas Edge Functions
- Teste em ambiente local

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do navegador
2. Consulte a documentação do Supabase
3. Teste com usuários de exemplo
4. Verifique configuração das variáveis

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

---

**Desenvolvido com ❤️ para facilitar o controle de ponto empresarial**