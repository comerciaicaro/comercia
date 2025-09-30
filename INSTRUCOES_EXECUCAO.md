# 🚀 INSTRUÇÕES DE EXECUÇÃO - SISTEMA DINÂMICA

## 📋 PRÉ-REQUISITOS

### 1. Instalar Node.js
- Baixe e instale o Node.js 18+ de: https://nodejs.org/
- Verifique a instalação: `node --version` e `npm --version`

### 2. Instalar MySQL
**Opção 1 - XAMPP (Recomendado para desenvolvimento):**
- Baixe de: https://www.apachefriends.org/
- Instale e inicie Apache + MySQL no painel de controle

**Opção 2 - MySQL Standalone:**
- Baixe de: https://dev.mysql.com/downloads/mysql/
- Configure usuário root (com ou sem senha)

### 3. Instalar VSCode (Opcional)
- Baixe de: https://code.visualstudio.com/
- Extensões recomendadas: ES7+ React/Redux/React-Native snippets, Auto Rename Tag

## 🛠️ CONFIGURAÇÃO NO VSCODE

### 1. Abrir o Projeto
```bash
# Clone ou baixe o projeto
cd dinamica-saas

# Abrir no VSCode
code .
```

### 2. Configurar Terminal Integrado
- Abra o terminal integrado: `Ctrl + `` (backtick)
- Ou vá em: Terminal > New Terminal

### 3. Instalar Dependências
```bash
# No terminal do VSCode, execute:
npm install
```

### 4. Configurar Banco de Dados
```bash
# Executar setup do banco
npm run setup-db
```

## ▶️ EXECUTAR O SISTEMA

### 1. Iniciar Backend (Terminal 1)
```bash
# No terminal do VSCode:
npm run server:dev
```
**Aguarde a mensagem:** `🚀 Servidor Dinâmica Rodando`

### 2. Iniciar Frontend (Terminal 2)
```bash
# Abra um novo terminal (Ctrl + Shift + `)
npm run dev
```
**Aguarde a mensagem:** `Local: http://localhost:5173`

### 3. Acessar o Sistema
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001/api/health
- **Página de Testes:** http://localhost:5173/teste

## 🔑 CREDENCIAIS DE ACESSO

### Usuários Padrão:
- **Admin:** admin@dinamica.com / admin123
- **Usuário Teste:** teste@dinamica.com / teste123
- **Barbearia:** barbearia@dinamica.com / barbearia123

## 🧪 TESTAR O SISTEMA

### 1. Página de Testes
- Acesse: http://localhost:5173/teste
- Clique em "Executar Todos os Testes"
- Verifique se todos os testes passam

### 2. Teste Manual
1. Faça login com qualquer usuário
2. Navegue pelas páginas do dashboard
3. Teste criação de agentes (sem API keys funcionará parcialmente)
4. Configure API keys em "APIs" para funcionalidade completa

## ⚙️ CONFIGURAR APIS (OPCIONAL)

### 1. Acessar Configurações
- Login no sistema
- Vá em: Dashboard > APIs
- Configure suas chaves reais

### 2. APIs Suportadas:
- **OpenAI:** https://platform.openai.com/api-keys
- **Gemini:** https://makersuite.google.com/app/apikey
- **Hugging Face:** https://huggingface.co/settings/tokens

## 🔧 COMANDOS ÚTEIS

```bash
# Verificar status dos serviços
npm run server:dev    # Backend
npm run dev          # Frontend

# Recriar banco de dados
npm run setup-db

# Build para produção
npm run build
npm run start

# Verificar dependências
npm audit
```

## 🐛 SOLUÇÃO DE PROBLEMAS

### Erro de Porta Ocupada:
```bash
# Matar processo na porta 3001
npx kill-port 3001

# Matar processo na porta 5173
npx kill-port 5173
```

### Erro de Banco de Dados:
1. Verifique se MySQL está rodando
2. Confirme credenciais no arquivo `server/.env`
3. Execute novamente: `npm run setup-db`

### Erro de Dependências:
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Erro de Permissões (Windows):
- Execute o terminal como Administrador
- Ou configure: `npm config set fund false`

## 📁 ESTRUTURA DE ARQUIVOS

```
dinamica-saas/
├── src/                 # Frontend React
│   ├── components/      # Componentes
│   ├── pages/          # Páginas
│   ├── services/       # Serviços API
│   └── contexts/       # Context API
├── server/             # Backend Node.js
│   ├── routes/         # Rotas API
│   ├── config/         # Configurações
│   └── middleware/     # Middlewares
├── public/             # Arquivos estáticos
└── package.json        # Dependências
```

## 🎯 PRÓXIMOS PASSOS

1. **Sistema Básico:** Funciona sem API keys
2. **IA Completa:** Configure pelo menos uma API key (Gemini recomendado)
3. **WhatsApp:** Configure credenciais do WhatsApp Business
4. **Email:** Configure SMTP para notificações

## 📞 SUPORTE

Se encontrar problemas:
1. Verifique os logs no terminal
2. Acesse a página de testes: http://localhost:5173/teste
3. Confirme se MySQL está rodando
4. Verifique se as portas 3001 e 5173 estão livres

**Sistema pronto para uso! 🎉**