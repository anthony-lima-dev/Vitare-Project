# 15. Configuração e variáveis de ambiente

[🇧🇷 Português (Brasil)](15-configuracao.md) | [🇺🇸 English](../en/15-configuration.md) | [Índice](00-indice.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 15.1 Arquivos de referência

O projeto possui modelos de configuração separados por finalidade:

- `apps/api/.env.example`: variáveis do backend;
- `infra/local/.env.example`: configuração do ambiente local;
- `infra/public/.env.public.example`: configuração do ambiente público.

Os arquivos reais são criados a partir desses exemplos e não devem ser versionados. Cada ambiente deve possuir seus próprios valores, especialmente credenciais de banco, tokens JWT, chaves criptográficas e credenciais externas.

## 15.2 Variáveis de banco de dados

| Variável | Uso |
|---|---|
| `POSTGRES_DB` | Nome do banco criado pelo contêiner PostgreSQL. |
| `POSTGRES_USER` | Usuário inicial do banco. |
| `POSTGRES_PASSWORD` | Senha do usuário do banco. |
| `DATABASE_URL` | URL de conexão utilizada pelo Prisma CLI e configuração de migrações. |
| `DIRECT_URL` | URL de conexão direta declarada para tarefas administrativas/Prisma. |
| `POOLED_DATABASE_URL` | URL utilizada pelo adapter PostgreSQL em runtime. |

No Compose, o host interno do serviço é `db`. O hostname não deve ser substituído por `localhost` nas URLs utilizadas entre contêineres. A URL usada pelo navegador é distinta da URL de conexão ao banco.

## 15.3 Origem da aplicação e CORS

| Variável | Uso |
|---|---|
| `APP_URL` | Origem pública utilizada por links e serviços da aplicação. |
| `CORS_ORIGIN` | Lista de origens autorizadas a realizar chamadas com CORS. |
| `VITE_API_URL` | URL base da API incorporada no build frontend. |
| `PORT` | Porta HTTP da API NestJS. |
| `NODE_ENV` | Perfil de execução Node.js. |
| `TRUST_PROXY` | Configuração de confiança nos cabeçalhos encaminhados pelo proxy. |

Para publicação same-origin, `VITE_API_URL` utiliza `/api/v1`. Alterar esse valor após o build exige reconstruir a imagem web, pois variáveis `VITE_*` são incorporadas aos recursos gerados pelo Vite.

`APP_URL`, `CORS_ORIGIN` e `GOOGLE_CALLBACK_URL` devem representar a mesma origem pública prevista para o navegador, considerando as rotas de callback.

## 15.4 Google OAuth

- `GOOGLE_CLIENT_ID`: identificador OAuth da aplicação.
- `GOOGLE_CLIENT_SECRET`: segredo do cliente OAuth.
- `GOOGLE_CALLBACK_URL`: endereço de retorno cadastrado no Google Console.

O callback deve corresponder exatamente ao endereço usado pelo backend. Em mudança de domínio ou ambiente, atualize as URLs no arquivo de ambiente e no cadastro do provedor.

## 15.5 JWT e senhas

| Variável | Uso |
|---|---|
| `JWT_ACCESS_SECRET` | Assinatura do access JWT do paciente. |
| `JWT_ACCESS_EXPIRES_IN` | Validade do access token. |
| `JWT_REFRESH_EXPIRES_IN` | Validade do refresh token. |
| `STAFF_JWT_SECRET` | Assinatura do JWT da equipe. |
| `STAFF_JWT_EXPIRES_IN` | Validade do token da equipe. |
| `BCRYPT_SALT_ROUNDS` | Custo de processamento bcrypt. |
| `PASSWORD_MIN_LENGTH` | Comprimento mínimo de senha. |
| `PASSWORD_MIN_RULES` | Quantidade mínima de critérios da política de senha. |

Os segredos de paciente e equipe devem ser diferentes, aleatórios e exclusivos por ambiente.

## 15.6 E-mail e provisionamento

- `RESEND_API_KEY`: chave de API para envio de e-mail.
- `MAIL_FROM`: remetente utilizado nas mensagens.
- `STAFF_BOOTSTRAP_KEY`: chave para criação da primeira conta de equipe.

O remetente deve ser configurado de acordo com um domínio verificado no provedor. A chave de bootstrap é utilizada no procedimento inicial e deve ser protegida como segredo de administração.

## 15.7 Redis e recursos operacionais

| Variável | Uso |
|---|---|
| `REDIS_URL` | Endereço de conexão do Redis. |
| `REDIS_KEY_PREFIX` | Prefixo de organização de chaves. |
| `STAFF_GEO_KEY` | Chave do índice geoespacial da equipe. |
| `STAFF_GEO_TTL_SECONDS` | Validade do registro de frescor de posição. |
| `EMERGENCY_SEARCH_RADIUS_M` | Raio de busca operacional em metros. |
| `EMERGENCY_IDEMPOTENCY_TTL_HOURS` | Janela de validade de registros de idempotência. |
| `THROTTLE_TTL` | Janela temporal do throttler em milissegundos. |
| `THROTTLE_LIMIT` | Limite de requisições por janela. |

Redis pode estar desabilitado no desenvolvimento local quando `REDIS_URL` não está definida. Os adaptadores possuem comportamento próprio para cache e operações que dependem do serviço.

## 15.8 Criptografia

| Variável | Uso |
|---|---|
| `ENCRYPTION_KEY` | Chave AES-256-GCM para cifrar campos. |
| `BLINDED_INDEX_KEY` | Chave HMAC-SHA-256 para índices cegos. |
| `ENCRYPTION_KEY_ID` | Identificador numérico da versão de chave. |

As duas chaves devem ser independentes e decodificar para 32 bytes. Exemplo de geração em ambiente seguro:

```bash
openssl rand -base64 32
```

Execute o comando separadamente para cada chave. Não reutilize o mesmo valor para AES e HMAC. A versão da chave deve ser mantida junto ao envelope criptográfico, enquanto o material secreto permanece fora do banco e dos artefatos de build.

## 15.9 Documentos legais

As variáveis de onboarding definem as versões e hashes dos documentos obrigatórios:

- `TERMS_OF_USE_VERSION`;
- `TERMS_OF_USE_CONTENT_HASH`;
- `PRIVACY_NOTICE_VERSION`;
- `PRIVACY_NOTICE_CONTENT_HASH`.

O backend utiliza esses valores para reconhecer qual versão deve ser aceita e registrar o hash correspondente. Atualizar o conteúdo publicado exige atualizar a versão e calcular um novo hash do texto efetivamente apresentado ao usuário.

## 15.10 Variáveis locais de rede

`HTTP_BIND` e `HTTPS_BIND` definem os endereços do host nos quais o Nginx local publica as portas 80 e 443. Para demonstração em LAN, o host deve aceitar conexões na interface de rede correspondente e o firewall precisa permitir as portas utilizadas.

## 15.11 Validação da configuração

Antes de iniciar o Compose:

1. confira se todas as variáveis obrigatórias estão presentes;
2. verifique as URLs de banco e os nomes de host de cada rede;
3. confirme que `APP_URL`, CORS e callbacks são coerentes;
4. confirme que as chaves criptográficas possuem formato e tamanho corretos;
5. valide o arquivo Compose com `docker compose config`;
6. mantenha a saída da configuração resolvida em ambiente privado, pois pode conter segredos interpolados.

O backend realiza validação fail-fast das variáveis obrigatórias no bootstrap por meio de `configuration.ts`.
