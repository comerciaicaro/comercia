# Guia de Deploy no Netlify

## Passos para Deploy

### 1. Configure as Variáveis de Ambiente no Netlify

No painel do Netlify, vá em **Site settings > Environment variables** e adicione:

```
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_URL=sua_url_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_servico
JWT_SECRET=gere_um_segredo_aleatorio_seguro
```

### 2. Configurações de Build

O projeto já está configurado com `netlify.toml`:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

### 3. Deploy

1. Conecte seu repositório no Netlify
2. O deploy será automático após cada push
3. A API estará disponível em `/.netlify/functions/api`

### 4. Após o Deploy

- Teste o login com as credenciais criadas no Supabase
- Verifique se as rotas da API estão funcionando
- Configure domínio customizado se necessário

## Estrutura

- Frontend: Compilado para `/dist`
- Backend: Netlify Functions em `/netlify/functions/api.js`
- Database: Supabase PostgreSQL

## Solução de Problemas

Se encontrar erros:

1. Verifique as variáveis de ambiente
2. Confirme que o Supabase está configurado corretamente
3. Verifique os logs no painel do Netlify
