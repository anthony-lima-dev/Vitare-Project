[🇧🇷 Português (Brasil)](README.md) | [🇺🇸 English](README.en.md)

<p align="center">
  <img src="Vitare/apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

# Vitare 2026

O **Vitare** é uma plataforma web composta por duas aplicações instaláveis (PWA), uma API central e uma infraestrutura baseada em contêineres. A aplicação do paciente permite organizar informações pessoais e clínicas e registrar solicitações de emergência. O portal da equipe oferece recursos de monitoramento, atribuição e acompanhamento de ocorrências, além de consulta clínica sujeita a autorização por perfil profissional.

O repositório está organizado como monorepo pnpm e reúne React, Vite, TypeScript, NestJS, Prisma ORM, PostgreSQL, Redis, Socket.IO, Docker Compose e Cloudflare Tunnel.

> **Escopo operacional:** o Vitare registra e encaminha ocorrências para o fluxo interno de monitoramento da própria plataforma. Ele não substitui os serviços públicos de emergência, avaliação profissional ou atendimento médico. A implementação analisada não contém integração operacional direta com SAMU, hospitais ou centrais governamentais de regulação.

## Documentação

- [Documentação completa em português](Vitare/docs/pt/00-indice.md)
- [Full documentation in English](Vitare/docs/en/00-index.md)

Os documentos detalham arquitetura, aplicações, API, autenticação, domínio clínico, emergência, sincronização offline, dados, segurança e procedimentos de implantação/operação.

## Arquitetura resumida

| Componente | Diretório | Responsabilidade |
|---|---|---|
| Aplicação do paciente | `apps/web/` | Perfil, dados clínicos, catálogos, contatos, acionamento de emergência e recursos PWA. |
| Portal da equipe | `apps/web-staff/` | Autenticação profissional, feed, atendimento, consulta autorizada e recursos PWA. |
| API | `apps/api/` | Autenticação, autorização, regras de negócio, persistência, processamento de emergência e eventos. |
| Tipos compartilhados | `packages/core-typings/` | Contratos e tipos utilizados pelas aplicações. |
| Componentes compartilhados | `packages/ui-components/` | Componentes React reutilizáveis. |
| Infraestrutura pública | `infra/public/` | Docker Compose, Nginx, imagens de produção e Cloudflare Tunnel. |
| Infraestrutura local | `infra/local/` | Docker Compose local, HTTPS na LAN, certificados e scripts de banco. |

As duas aplicações frontend possuem manifesto e Service Worker próprios. A aplicação do paciente também mantém cache de leitura e outbox de emergência no IndexedDB. A aplicação da equipe mantém o shell e os recursos estáticos, mas executa aceite, resolução e consultas por meio da API.

## Implantação pública — procedimento prioritário

A implantação pública está definida em `infra/public/`. O tráfego é recebido pelo Cloudflare e encaminhado ao Nginx por meio do Cloudflare Tunnel. O Nginx serve os dois frontends e encaminha REST e Socket.IO para a API NestJS. PostgreSQL e Redis ficam em redes Docker sem portas publicadas no host.

```text
Navegador (HTTPS)
   |
Cloudflare Edge (DNS/TLS)
   |
Cloudflare Tunnel (cloudflared)
   |
Nginx (web:80)
   |-- /                    -> aplicação do paciente
   |-- /monitoramento/      -> portal da equipe
   |-- /api/                -> API NestJS (api:3000)
   `-- /socket.io/          -> Socket.IO (api:3000)
                                |
                         PostgreSQL 17
                         Redis 7
```

### Requisitos prévios

- Host Linux ou Windows com Docker Engine e plugin Docker Compose.
- Domínio administrado pelo Cloudflare e um Tunnel criado no Cloudflare Zero Trust.
- Credenciais próprias para PostgreSQL, JWT, criptografia, bootstrap da equipe e integrações habilitadas.
- Configuração do Google OAuth e Resend quando os respectivos fluxos forem utilizados.
- Estratégia externa de backup PostgreSQL e procedimento de restauração testado.

O ambiente de produção utiliza Node.js 22 nos Dockerfiles, pnpm `11.9.0`, PostgreSQL 17, Redis 7 e Nginx 1.29, conforme os arquivos de infraestrutura versionados.

### 1. Preparar as variáveis de ambiente

Na raiz do repositório:

```bash
cd infra/public
cp .env.public.example .env.public
chmod 600 .env.public
```

Edite `infra/public/.env.public` e substitua todos os placeholders. Os principais grupos são:

| Grupo | Variáveis |
|---|---|
| PostgreSQL/Prisma | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`, `DIRECT_URL`, `POOLED_DATABASE_URL` |
| Aplicação e origem | `VITE_API_URL`, `APP_URL`, `CORS_ORIGIN`, `PORT`, `NODE_ENV` |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` |
| Cloudflare | `TUNNEL_TOKEN` |
| JWT | `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `STAFF_JWT_SECRET`, `STAFF_JWT_EXPIRES_IN` |
| E-mail | `RESEND_API_KEY`, `MAIL_FROM` |
| Redis e localização | `REDIS_URL`, `REDIS_KEY_PREFIX`, `STAFF_GEO_KEY`, `STAFF_GEO_TTL_SECONDS` |
| Emergência | `EMERGENCY_IDEMPOTENCY_TTL_HOURS`, `EMERGENCY_SEARCH_RADIUS_M` |
| Provisionamento | `STAFF_BOOTSTRAP_KEY` |
| Criptografia | `ENCRYPTION_KEY`, `BLINDED_INDEX_KEY`, `ENCRYPTION_KEY_ID` |
| Senhas | `BCRYPT_SALT_ROUNDS`, `PASSWORD_MIN_LENGTH`, `PASSWORD_MIN_RULES` |

O backend valida variáveis obrigatórias durante a inicialização. Na configuração analisada, o conjunto inclui conexão com banco, chaves PII, segredos JWT, Google OAuth e Resend. Consulte `apps/api/src/config/configuration.ts` da revisão que será implantada para confirmar os valores exigidos.

Gere segredos exclusivos para cada ambiente. `ENCRYPTION_KEY` e `BLINDED_INDEX_KEY` devem ser diferentes e, após decodificação Base64, conter exatamente 32 bytes cada. Não reutilize valores de desenvolvimento, placeholders nem credenciais fornecidas em arquivos de teste.

### 2. Configurar o Cloudflare Tunnel

1. Crie um Tunnel no Cloudflare Zero Trust.
2. Configure `TUNNEL_TOKEN` no arquivo protegido `.env.public`.
3. Cadastre o hostname público, por exemplo `vitare.app.br`, apontando para a origem `http://web:80`.
4. Mantenha o hostname consistente com `server_name` e o healthcheck do Nginx.
5. Cadastre no Google Console o callback exato definido em `GOOGLE_CALLBACK_URL`.

O TLS público termina na borda Cloudflare. O conector `cloudflared` estabelece conexão de saída e encaminha o tráfego para o Nginx pela rede Docker `edge`. O Compose atual injeta o token por `.env.public`; mantenha uma única fonte de configuração para esse segredo.

### 3. Validar e iniciar

Ainda em `infra/public/`:

```bash
make config
make up
make ps
make logs
```

Para acompanhar serviços específicos:

```bash
make logs-api
make logs-tunnel
```

`make config` valida a configuração resolvida; como os valores de ambiente podem ser interpolados, execute-o em terminal privado e não publique sua saída. `make up` constrói e inicia os serviços em background.

A sequência de inicialização considera as dependências: PostgreSQL precisa estar saudável para a execução das migrações; a API depende da migração concluída e do Redis saudável; Nginx depende da API saudável; `cloudflared` depende do Nginx saudável.

### 4. Conferir o ambiente após a inicialização

- PostgreSQL: healthcheck por `pg_isready`.
- Redis: healthcheck por `redis-cli ping`.
- API: `GET /api/v1/health/ready`.
- Nginx: endpoint `/healthz` com o Host configurado.
- Aplicação do paciente: `https://SEU_DOMINIO/`.
- Portal da equipe: `https://SEU_DOMINIO/monitoramento/`.
- API: `https://SEU_DOMINIO/api/v1`.
- Socket.IO: `https://SEU_DOMINIO/socket.io/`.

Depois dos healthchecks, valide login, cadastro, callback OAuth, CORS, envio de e-mail, operações clínicas, acionamento idempotente, publicação da outbox, feed da equipe, WebSocket, geolocalização e instalação das duas PWAs em dispositivos reais.

### 5. Carregar os catálogos

Após confirmar o banco e as migrações:

```bash
make seed
```

O alvo `seed` aplica as migrações e executa `apps/api/prisma/seed.ts`, que carrega os arquivos JSON de doenças, agrupamentos e medicamentos. A execução deve ocorrer em procedimento controlado, com banco correto e backup compatível.

### 6. Provisionar a primeira conta da equipe

Consulte `GET /api/v1/staff/auth/setup-status`. Quando ainda não existir conta de equipe, o cadastro inicial exige `STAFF_BOOTSTRAP_KEY`, fornecida pelo header `X-Bootstrap-Key`. Após o provisionamento inicial, novos profissionais são cadastrados por um ator administrativo autenticado.

### 7. Atualizar e encerrar

```bash
make build
make pull
make restart
make down
```

`make down` remove os contêineres e preserva os volumes nomeados. O alvo `make down-v` executa `docker compose down -v` e remove os volumes, incluindo os dados persistidos do PostgreSQL. Utilize-o apenas quando a remoção integral do ambiente e dos dados for intencional.

## Execução local e desenvolvimento

O ambiente local encontra-se em `infra/local/`. Ele publica Nginx nas portas configuradas por `HTTP_BIND` e `HTTPS_BIND`, utiliza certificados locais e possibilita acesso por IP/hostname na LAN.

```bash
cd infra/local
cp .env.example .env.local
chmod 600 .env.local
make build
make up
make ps
make logs
```

Para instalar dependências e iniciar as aplicações em modo de desenvolvimento, execute na raiz:

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm install --frozen-lockfile

pnpm dev:api
pnpm dev:patient
pnpm dev:staff
```

Comandos de qualidade:

```bash
pnpm build
pnpm lint
pnpm check:infra
pnpm --filter @vitare/api test
pnpm --filter @vitare/web test
pnpm --filter @vitare/web-staff test
pnpm exec playwright test
```

A API requer PostgreSQL, configuração de ambiente e as dependências exigidas no bootstrap. Consulte [infraestrutura local](Vitare/docs/pt/14-infraestrutura-local.md) e [desenvolvimento e testes](Vitare/docs/pt/17-desenvolvimento-testes.md).

## Segurança para publicação no GitHub

O repositório deve conter somente arquivos de exemplo sem credenciais. Não publique `.env`, `.env.local`, `.env.public`, tokens de Tunnel, chaves privadas, certificados de desenvolvimento ou dumps de banco. Antes de tornar o repositório público, revise o histórico Git, branches, tags e artefatos de CI. Caso algum segredo real tenha sido compartilhado, revogue ou rotacione a credencial correspondente. A substituição de chaves AES/HMAC deve ser acompanhada de um procedimento de migração dos dados e índices existentes.

Os dados de saúde e os identificadores pessoais tratados pelo Vitare exigem controles de acesso, criptografia, minimização, retenção e auditoria adequados. Consulte [segurança e privacidade](Vitare/docs/pt/12-seguranca-privacidade.md).

## Estrutura do repositório

```text
apps/
  api/          NestJS, Prisma, módulos e integrações
  web/          aplicação PWA do paciente
  web-staff/    aplicação PWA da equipe
packages/
  core-typings/ contratos e tipos compartilhados
  ui-components/ componentes React compartilhados
infra/
  public/       publicação pública, Nginx e Cloudflare Tunnel
  local/        ambiente local/LAN, HTTPS e scripts
docs/
  pt/           documentação em português brasileiro
  en/           documentação em inglês
```

## Documentação técnica

- [Índice completo](Vitare/docs/pt/00-indice.md)
- [Arquitetura](Vitare/docs/pt/02-arquitetura.md)
- [Aplicação do paciente](Vitare/docs/pt/03-aplicacao-paciente.md)
- [Portal da equipe](Vitare/docs/pt/04-portal-equipe.md)
- [API REST](Vitare/docs/pt/05-api.md)
- [Identidade e sessões](Vitare/docs/pt/06-identidade-sessoes.md)
- [Domínio clínico e catálogos](Vitare/docs/pt/07-dominio-clinico.md)
- [Acionamento de emergência](Vitare/docs/pt/08-emergencias.md)
- [Operação offline e outboxes](Vitare/docs/pt/09-offline-sincronizacao.md)
- [Tempo real e Redis](Vitare/docs/pt/10-tempo-real-redis.md)
- [Modelo de dados](Vitare/docs/pt/11-modelo-dados.md)
- [Segurança e privacidade](Vitare/docs/pt/12-seguranca-privacidade.md)
- [Infraestrutura pública](Vitare/docs/pt/13-infraestrutura-publica.md)
- [Infraestrutura local](Vitare/docs/pt/14-infraestrutura-local.md)
- [Configuração](Vitare/docs/pt/15-configuracao.md)
- [Operação, backup e recuperação](Vitare/docs/pt/16-operacao-backup.md)
- [Desenvolvimento e testes](Vitare/docs/pt/17-desenvolvimento-testes.md)
