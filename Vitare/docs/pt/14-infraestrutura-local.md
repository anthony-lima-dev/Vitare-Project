# 14. Infraestrutura local

[🇧🇷 Português (Brasil)](14-infraestrutura-local.md) | [🇺🇸 English](../en/14-local-infrastructure.md) | [Índice](00-indice.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 14.1 Finalidade

`infra/local/` fornece um ambiente integrado para desenvolvimento, testes de integração e demonstração em rede local. O Compose executa PostgreSQL, serviço de migração, Redis, API NestJS e Nginx. A camada Nginx publica as aplicações web e encaminha as chamadas para a API.

O ambiente local utiliza certificados de desenvolvimento e publica as portas HTTP/HTTPS configuradas no host. A implantação pública, por sua vez, utiliza Cloudflare Tunnel e não publica portas de aplicação diretamente no host.

## 14.2 Serviços e redes

O Compose local define:

- `db`: PostgreSQL 17, com volume `vitare_pg_data`;
- `migrate`: execução de migrações Prisma;
- `redis`: Redis 7 para cache e recursos operacionais;
- `api`: aplicação NestJS na porta interna 3000;
- `web`: Nginx com os dois builds frontend e certificados montados em modo somente leitura.

A API participa das redes `edge` e `data`. O Nginx utiliza a rede `edge`, e os serviços de banco, migração e Redis utilizam `data`. O volume nomeado preserva os dados PostgreSQL entre recriações de contêineres.

O Compose não publica portas para PostgreSQL e Redis. As portas de host são publicadas pelo serviço `web`, conforme `HTTP_BIND` e `HTTPS_BIND`.

## 14.3 Preparação do arquivo de ambiente

Na pasta `infra/local/`:

```bash
cp .env.example .env.local
chmod 600 .env.local
```

Configure as credenciais do PostgreSQL, URLs do Prisma, origem da aplicação, CORS, callback Google, segredos JWT, Redis, Resend, chave de bootstrap e chaves criptográficas. Ajuste também `HTTP_BIND` e `HTTPS_BIND` para os endereços de rede que devem receber conexões.

Para acesso por outro dispositivo da LAN, o domínio/IP utilizado no navegador precisa corresponder ao certificado e às configurações de origem.

## 14.4 Certificados HTTPS

O script `infra/local/scripts/generate-certs.sh` utiliza `mkcert` para gerar certificados de desenvolvimento para localhost e/ou IP configurado.

Exemplo de uso:

```bash
cd infra/local
./scripts/generate-certs.sh IP_DA_MAQUINA
```

Os arquivos `vitare.crt` e `vitare.key` são montados no Nginx em `/etc/nginx/certs/`. O certificado raiz da autoridade local precisa ser confiável no dispositivo que acessará a aplicação. Em celulares, a instalação de confiança deve ser realizada no próprio dispositivo.

O uso de HTTPS confiável habilita os recursos de navegador que dependem de contexto seguro, como instalação PWA e geolocalização.

## 14.5 Subir os serviços

Diretamente em `infra/local/`:

```bash
docker compose --env-file .env.local -f compose.yaml up -d --build
docker compose --env-file .env.local -f compose.yaml ps
docker compose --env-file .env.local -f compose.yaml logs -f --tail=200
```

O Makefile local também disponibiliza:

```bash
make init
make build
make up
make ps
make logs
make restart
make down
make migrate
make backup
```

Na raiz do monorepo, os atalhos equivalentes incluem `pnpm infra:up`, `pnpm infra:down` e `pnpm infra:logs`.

## 14.6 Acesso às aplicações

- Paciente: `https://HOST/`.
- Equipe: `https://HOST/monitoramento/`.
- API: `https://HOST/api/v1`.
- Socket.IO: `https://HOST/socket.io/`.

O Nginx local recebe HTTP na porta 80 e redireciona para HTTPS na porta 443. No endpoint HTTPS, serve os bundles do paciente e da equipe e encaminha API e WebSocket para `api:3000`.

## 14.7 Backups locais

`infra/local/scripts/backup-db.sh` gera dump PostgreSQL em formato customizado. `restore-db.sh` restaura o arquivo utilizando `pg_restore`. Os scripts recebem configuração do ambiente local e devem ser executados com destino e dados adequados ao procedimento.

Exemplo:

```bash
cd infra/local
make backup
```

O restore utiliza opções de limpeza de objetos existentes. Antes de executar uma restauração, confirme o banco de destino e mantenha cópia compatível do estado que será substituído.

## 14.8 Persistência e limpeza

`docker compose down` remove contêineres e mantém o volume nomeado. `docker compose down -v` remove os volumes e seus dados. O alvo `make clean` no ambiente local executa a remoção do volume PostgreSQL.

A remoção integral é apropriada para recriar um ambiente de demonstração; para preservar dados entre execuções, utilize somente os comandos que não removem volumes.

## 14.9 Uso em LAN

O endereço usado pelos dispositivos da rede local precisa resolver para o host que executa o Compose. O firewall deve permitir somente as portas necessárias para a demonstração. PostgreSQL e Redis permanecem acessíveis apenas pelas redes Docker; a interface de usuário acessa os serviços pela mesma origem HTTPS do Nginx.

## 14.10 Diferenças em relação à implantação pública

| Aspecto | Local | Público |
|---|---|---|
| Entrada | Nginx publicado nas portas HTTP/HTTPS do host. | Cloudflare Tunnel até Nginx, sem portas de aplicação publicadas no host. |
| Certificado | Certificado de desenvolvimento gerado localmente. | TLS na borda Cloudflare. |
| Redes | Redes Docker locais `edge` e `data`. | Redes `edge`, `app` e `data`, com `data` interna. |
| Persistência | Volume `vitare_pg_data`. | Volume `vitare_public_pg_data`. |
| Arquivo de ambiente | `.env.local`. | `.env.public`. |
| Uso | Desenvolvimento, integração e demonstração em LAN. | Publicação externa. |
