# 16. Operação, backup e recuperação

[🇧🇷 Português (Brasil)](16-operacao-backup.md) | [🇺🇸 English](../en/16-operations-backup.md) | [Índice](00-indice.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 16.1 Operação do ambiente público

A rotina operacional deve acompanhar contêineres, healthchecks, capacidade do host, uso de armazenamento, conectividade do Tunnel, estado das migrações, conexões de banco, erros de API e eventos pendentes na outbox.

Comandos no diretório `infra/public/`:

```bash
make config
make up
make ps
make logs
make logs-api
make logs-tunnel
make restart
make build
make pull
```

Esses comandos utilizam o arquivo `.env.public` e o `compose.yaml` do diretório atual.

## 16.2 Healthchecks

O stack utiliza verificações específicas por serviço:

| Serviço | Verificação |
|---|---|
| PostgreSQL | `pg_isready` com usuário e banco configurados. |
| Redis | `redis-cli ping`. |
| API | Requisição HTTP para `/api/v1/health/ready`. |
| Nginx | Requisição para `/healthz` com Host esperado. |
| Cloudflare Tunnel | Estado do conector e logs do `cloudflared`. |

O readiness da API considera as dependências definidas pelo módulo de saúde. A operação também deve acompanhar a disponibilidade do domínio público e do Tunnel.

## 16.3 Logs

O Compose configura o driver `json-file` com rotação por tamanho e quantidade de arquivos para os serviços. Os comandos `make logs`, `make logs-api` e `make logs-tunnel` facilitam a análise dos eventos por componente.

Logs devem priorizar horário, serviço, nível, identificador de correlação e resultado operacional. Credenciais, tokens, conteúdo de formulários, CPF integral e dados clínicos não devem ser incluídos em registros de aplicação.

## 16.4 Backup PostgreSQL

O PostgreSQL público utiliza o volume nomeado `vitare_public_pg_data`. O volume preserva os dados entre recriações de contêiner, enquanto o backup deve ser armazenado de forma independente do host de execução.

O ambiente local disponibiliza `infra/local/scripts/backup-db.sh`, que gera dump PostgreSQL em formato customizado. Um procedimento equivalente pode ser realizado no ambiente público com `pg_dump`:

```bash
docker compose --env-file .env.public -f compose.yaml exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > backup-vitare.dump
```

O arquivo de backup contém informações pessoais e clínicas e deve ser armazenado cifrado, com controle de acesso e período de retenção estabelecido.

## 16.5 Restauração

O script `infra/local/scripts/restore-db.sh` utiliza `pg_restore` para restaurar dumps customizados. A restauração deve ser realizada em banco de destino definido para o procedimento.

Exemplo conceitual:

```bash
docker compose --env-file .env.local -f compose.yaml exec -T db \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner < backup-vitare.dump
```

Confirme o banco, as credenciais e o arquivo antes da execução. As opções `--clean` e `--if-exists` substituem objetos existentes no destino.

## 16.6 Recuperação de chaves criptográficas

A restauração dos dados protegidos depende das chaves utilizadas na criptografia. As cópias de `ENCRYPTION_KEY`, `BLINDED_INDEX_KEY` e dos identificadores de versão devem ser preservadas por processo seguro e separado do backup do banco.

Após a restauração, valide conexão, migrations, geração de cliente, descriptografia de registros e consultas que utilizam índices cegos. Os dados cifrados devem ser recuperáveis com o conjunto de chaves correspondente aos envelopes armazenados.

## 16.7 Migrações

O processo de deploy utiliza `prisma migrate deploy`. Antes da execução:

1. confira a revisão do código e do schema;
2. identifique a migration pendente;
3. confirme o banco de destino;
4. mantenha backup consistente;
5. execute a migração pelo serviço `migrate`;
6. acompanhe logs e healthchecks após a conclusão.

`migrate deploy` aplica migrações versionadas. A evolução do banco deve ser coordenada com a versão da API que consome o schema.

## 16.8 Operação do Redis

Redis mantém dados auxiliares de cache, localização, locks e throttling. O Compose público executa Redis sem AOF e sem volume persistente. O estado de negócio permanece no PostgreSQL; Redis é utilizado para funções operacionais e temporárias.

A operação deve acompanhar uso de memória, disponibilidade, reconexões, latência e funcionamento das chaves GEO e de locks.

## 16.9 Atualizações do stack

Para atualizar imagens e aplicações:

```bash
cd infra/public
make pull
make build
make up
```

A atualização das imagens e a aplicação de migrações devem seguir a janela de implantação definida pelo responsável operacional. Após o deploy, valide healthchecks, domínio, login, consulta clínica autorizada, acionamento, sincronização, feed e WebSocket.

## 16.10 Encerramento do ambiente

`make down` interrompe e remove os contêineres, preservando os volumes nomeados. `make down-v` remove os volumes do Compose, inclusive o volume PostgreSQL. No ambiente local, `make clean` também realiza a remoção do volume de dados.

O encerramento deve considerar a preservação dos dados e a continuidade do serviço antes de executar comandos que removam volumes.
