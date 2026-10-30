# 13. Infraestrutura pública

[🇧🇷 Português (Brasil)](13-infraestrutura-publica.md) | [🇺🇸 English](../en/13-public-infrastructure.md) | [Índice](00-indice.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 13.1 Finalidade

`infra/public/` contém a infraestrutura destinada à publicação do Vitare na Internet. O stack utiliza Docker Compose para coordenar PostgreSQL, migrações, Redis, API NestJS, Nginx e Cloudflare Tunnel.

A entrada externa ocorre pelo Cloudflare Tunnel. O host não precisa publicar as portas internas da API, PostgreSQL ou Redis. O Nginx recebe as requisições no contêiner `web` e encaminha cada caminho para o serviço correspondente.

## 13.2 Fluxo de entrada

O caminho da requisição é:

1. O navegador acessa o domínio público por HTTPS.
2. Cloudflare recebe a requisição e aplica o serviço de DNS/proxy configurado.
3. O conector `cloudflared` mantém uma conexão de saída com a rede Cloudflare.
4. O Tunnel encaminha a requisição para `web:80` na rede Docker `edge`.
5. O Nginx serve os arquivos estáticos ou encaminha a requisição para `api:3000`.
6. A API acessa PostgreSQL e Redis pelas redes Docker internas.

Mapeamento de rotas do Nginx:

| Caminho | Destino |
|---|---|
| `/` | Aplicação do paciente. |
| `/monitoramento/` | Aplicação da equipe. |
| `/api/` | API NestJS. |
| `/socket.io/` | Gateway Socket.IO da API. |
| `/healthz` | Healthcheck do Nginx. |

## 13.3 Serviços Docker Compose

O arquivo `infra/public/compose.yaml` define:

| Serviço | Imagem/build | Função |
|---|---|---|
| `db` | `postgres:17-bookworm` | PostgreSQL e volume persistente. |
| `migrate` | `Dockerfile.api`, target `migrate` | Executa migrações Prisma. |
| `redis` | `redis:7-bookworm` | Cache, GEO, locks e throttling. |
| `api` | `Dockerfile.api`, target `runtime` | Aplicação NestJS na porta interna 3000. |
| `web` | `Dockerfile.web` | Nginx e bundles dos dois frontends. |
| `cloudflared` | `cloudflare/cloudflared` | Conexão de saída para Tunnel. |

A API é conectada às redes `app` e `data`; o Nginx às redes `edge` e `app`; Cloudflare Tunnel à rede `edge`. PostgreSQL, Redis e migrações usam a rede `data`, que possui `internal: true`.

Nenhum serviço publica `ports` no host. Os serviços utilizam `expose` quando precisam declarar portas internas de comunicação. O banco mantém seus dados no volume nomeado `vitare_public_pg_data`.

## 13.4 Inicialização por dependências

A sequência declarada pelo Compose organiza a inicialização:

1. `db` inicia e passa pelo healthcheck `pg_isready`.
2. `migrate` executa `prisma migrate deploy` após o banco estar saudável.
3. `redis` inicia e passa pelo healthcheck `redis-cli ping`.
4. `api` inicia após a conclusão bem-sucedida de `migrate` e disponibilidade de Redis.
5. `web` inicia depois que a API está saudável.
6. `cloudflared` inicia depois que Nginx está saudável.

A API possui healthcheck em `/api/v1/health/ready`. Nginx possui `/healthz`, verificado com o Host definido no arquivo de configuração.

## 13.5 Preparação do ambiente

A partir da raiz do monorepo:

```bash
cd infra/public
cp .env.public.example .env.public
chmod 600 .env.public
```

O arquivo `.env.public` concentra as variáveis de execução e é fornecido aos serviços que necessitam delas. Ele deve ser preenchido com os valores do ambiente público e mantido fora do Git.

Configure os endereços de banco para a rede Compose, a origem pública, CORS, callback do Google, credenciais do Resend, segredos JWT, chave de bootstrap, chaves de criptografia, conexão Redis e token do Tunnel.

A imagem frontend recebe `VITE_API_URL` como argumento de build. Para a implantação same-origin, o valor padrão é `/api/v1`.

## 13.6 Configuração do Cloudflare

No Cloudflare Zero Trust, crie um Tunnel e associe seu token a `TUNNEL_TOKEN`. Configure o hostname público para encaminhar à origem `http://web:80`. O Nginx da versão fornecida utiliza `server_name vitare.app.br` e rejeita Host desconhecido.

Ao utilizar outro domínio, mantenha o mesmo nome coerente em:

- hostname público do Tunnel;
- `server_name` e validação de Host no Nginx;
- `APP_URL`;
- `CORS_ORIGIN`;
- `GOOGLE_CALLBACK_URL`;
- links de e-mail e demais URLs públicas.

O TLS externo é terminado no Cloudflare Edge. O conector estabelece o túnel de saída e alcança o Nginx pela rede Docker `edge`. O Compose atual fornece o token por `.env.public`; mantenha essa fonte única de configuração.

## 13.7 Nginx

O Nginx utiliza `infra/public/nginx.conf`. As responsabilidades incluem:

- rejeitar cabeçalhos Host desconhecidos;
- servir o build de `apps/web` na raiz;
- servir o build de `apps/web-staff` em `/monitoramento/`;
- encaminhar `/api/` para a API;
- encaminhar `/socket.io/` com suporte a upgrade WebSocket;
- configurar timeouts e buffering apropriados para API e realtime;
- fornecer `/healthz`;
- adicionar cabeçalhos HTTP de segurança;
- definir política de cache para assets versionados e recursos de aplicação.

O Nginx recebe os dois bundles compilados pelo `Dockerfile.web`, que realiza o build dos pacotes compartilhados e das aplicações frontend.

## 13.8 Comandos operacionais

O Makefile em `infra/public/` define `COMPOSE` com `.env.public` e `compose.yaml`.

| Comando | Ação |
|---|---|
| `make config` | Mostra a configuração Compose resolvida. |
| `make up` | Constrói e inicia os serviços em background. |
| `make ps` | Lista estado dos serviços. |
| `make logs` | Acompanha logs de todos os serviços. |
| `make logs-api` | Acompanha logs da API. |
| `make logs-tunnel` | Acompanha logs do Cloudflare Tunnel. |
| `make restart` | Reinicia os serviços. |
| `make build` | Reconstrói imagens com atualização das bases. |
| `make pull` | Baixa imagens atualizadas. |
| `make seed` | Executa migrações e carrega catálogos. |
| `make down` | Remove contêineres, preservando volumes. |
| `make down-v` | Remove contêineres e volumes. |

`make config` pode interpolar variáveis de ambiente na saída. Execute-o em ambiente privado e não publique os valores apresentados.

## 13.9 Migrações e catálogos

O serviço `migrate` executa `prisma migrate deploy`. O alvo `make seed` constrói a imagem de migração, executa as migrações e depois inicia `prisma/seed.ts`.

O seed importa os conjuntos de doenças, agrupamentos de códigos e medicamentos a partir dos arquivos JSON do projeto. A execução deve ser coordenada com o estado do banco e o processo de atualização dos catálogos.

## 13.10 Persistência e recursos

PostgreSQL utiliza o volume persistente `vitare_public_pg_data`. Redis é iniciado com `--appendonly no` e não possui volume persistente declarado no Compose público, sendo utilizado para dados operacionais e temporários.

O Compose define limites de CPU e memória por serviço e opções de segurança de contêiner, como `no-new-privileges`. Os logs JSON dos contêineres possuem rotação por tamanho e quantidade de arquivos.

## 13.11 Publicação e verificação

Após a subida, valide:

- estado saudável de `db`, `redis`, `api` e `web`;
- resolução DNS e certificado HTTPS do domínio;
- `/` e `/monitoramento/`;
- `/api/v1/health/ready`;
- login e cadastro nas duas aplicações;
- callback OAuth e CORS;
- entrega de e-mail quando habilitada;
- comunicação Socket.IO;
- acionamento, sincronização e feed;
- instalação e atualização de ambas as PWAs.

A implantação pública deve possuir política externa de backup, retenção, monitoramento e restauração PostgreSQL, além de armazenamento seguro das chaves de criptografia. Esses procedimentos complementam o stack Compose.
