# 2. Arquitetura

[🇧🇷 Português (Brasil)](02-arquitetura.md) | [🇺🇸 English](../en/02-architecture.md) | [Índice](00-indice.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 2.1 Monorepositório

O repositório utiliza pnpm workspaces e organiza aplicações e pacotes compartilhados em um único projeto:

```text
Vitare/
├── apps/
│   ├── api/                 # NestJS, Prisma e regras de backend
│   ├── web/                 # aplicação PWA do paciente
│   └── web-staff/           # aplicação PWA da equipe
├── packages/
│   ├── core-typings/        # tipos e contratos compartilhados
│   └── ui-components/       # componentes React reutilizáveis
├── infra/
│   ├── public/              # Compose público e Cloudflare Tunnel
│   └── local/               # Compose local e certificados
├── scripts/                 # verificações e utilitários
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

O `package.json` raiz declara `pnpm@11.9.0`. O workspace abrange `apps/*` e `packages/*`, habilita dependências locais e alinha versões de tipos React por overrides. Os Dockerfiles utilizam Node.js 22 e Corepack para preparar o gerenciador de pacotes.

## 2.2 Backend NestJS

A API está em `apps/api/`. O `AppModule` compõe os módulos funcionais registrados:

- `auth`
- `patients`
- `conditions`
- `medications`
- `contacts`
- `emergency`
- `health`
- `disease-dictionary`
- `medications-dictionary`
- `allergies`
- `forbidden-medications`
- `staff`
- `legal`

Esses módulos são complementados por infraestrutura compartilhada para Prisma, Redis, criptografia, throttling, filtros de exceção e configuração. A pasta `modules/clinical` também contém código de apoio/testes relacionado à criptografia clínica, mas não é um módulo adicional registrado no `AppModule`.

O bootstrap em `main.ts` cria a aplicação NestJS, configura Helmet e compressão, define CORS com base em `CORS_ORIGIN`, estabelece o prefixo `/api` e habilita versionamento URI com versão padrão `1`. A API é disponibilizada sob `/api/v1`, na porta definida por `PORT` (3000 no Compose).

O `ValidationPipe` global utiliza `whitelist`, `forbidNonWhitelisted` e `transform`, além de conversão implícita de tipos. Assim, os DTOs controlam o formato de entrada e propriedades não declaradas são rejeitadas. Os filtros globais tratam erros de domínio e de persistência Prisma.

## 2.3 Clean Architecture

A implementação organiza responsabilidades em camadas coerentes com Clean Architecture:

| Camada | Responsabilidade | Exemplos no projeto |
|---|---|---|
| `presentation` | Recepção e exposição de interações | Controllers HTTP, DTOs, guards e gateway Socket.IO. |
| `application` | Orquestração dos casos de uso | Serviços de aplicação, use cases e portas. |
| `domain` | Regras e conceitos do negócio | Entidades, tipos, value objects e contratos de repositório. |
| `infrastructure` | Implementações técnicas | Adaptadores Prisma, Redis, criptografia, e-mail e serviços externos. |

As regras de negócio devem permanecer independentes dos detalhes de transporte e persistência. Os casos de uso consomem contratos definidos nas camadas internas; adaptadores concretos implementam esses contratos. O NestJS realiza a composição de providers e dependências na inicialização.

## 2.4 DDD e contextos de negócio

A divisão em módulos organiza responsabilidades por contexto: identidade e autenticação, pacientes, condições clínicas, medicamentos, contatos, emergência, equipe, catálogos e atos legais. Cada contexto concentra seus controllers, regras de aplicação, elementos de domínio e adaptadores conforme a necessidade funcional.

A separação permite que alterações em um contexto sejam avaliadas sem transferir automaticamente responsabilidades para todos os demais. As dependências entre módulos devem ocorrer por contratos explícitos e evitar ciclos.

## 2.5 Frontends independentes

`apps/web` e `apps/web-staff` são aplicações React separadas. Cada uma possui seu próprio `App.tsx`, entrypoint, roteamento, cliente HTTP, contexto de sessão, configuração Vite e Service Worker.

O frontend do paciente utiliza rotas na raiz do domínio. O portal da equipe utiliza `base: /monitoramento/` no Vite e `basename="/monitoramento"` no `BrowserRouter`. As duas aplicações chamam a API pela mesma origem relativa `/api/v1` no build padrão.

A separação dos bundles e do escopo dos Service Workers permite que cada aplicação tenha ciclo de atualização e cache próprios. A autenticação e autorização permanecem sob controle da API.

## 2.6 Pacotes compartilhados

`@vitare/core-typings` concentra tipos usados por mais de uma aplicação, incluindo contratos e estruturas relacionadas à API. `@vitare/ui-components` disponibiliza componentes React reutilizáveis. Os Dockerfiles compilam esses pacotes antes da API e dos frontends para que os artefatos `dist` estejam disponíveis no processo de build.

## 2.7 Persistência e serviços auxiliares

- **PostgreSQL:** fonte persistente para usuários, profissionais, dados clínicos, ocorrências, tokens, registros legais e outbox.
- **Prisma ORM:** mapeamento dos modelos, geração do cliente e execução de migrações.
- **Redis:** cache, GEO, locks e armazenamento de throttling quando habilitado.
- **Socket.IO:** publicação de eventos operacionais para a equipe.
- **Google OAuth:** autenticação federada do paciente.
- **Resend:** envio de mensagens de e-mail.
- **Cloudflare Tunnel:** conexão de entrada pública sem publicação direta de portas da aplicação no host.

## 2.8 Sequência de build do monorepo

O comando `pnpm build` compila os pacotes compartilhados antes dos consumidores:

1. `@vitare/core-typings`;
2. `@vitare/ui-components`;
3. `@vitare/api`;
4. `@vitare/web`;
5. `@vitare/web-staff`.

`pnpm lint` executa ESLint nas três aplicações. `pnpm check:infra` executa `scripts/check-docker-build-context.mjs` para verificar o contexto utilizado pelos Dockerfiles.
