# 5. API REST

[🇧🇷 Português (Brasil)](05-api.md) | [🇺🇸 English](../en/05-api.md) | [Índice](00-indice.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 5.1 Endereço e versionamento

O backend utiliza prefixo global `/api` e versionamento URI com versão padrão `1`. Os endpoints públicos da aplicação ficam sob `/api/v1`. O cliente HTTP dos frontends utiliza a origem relativa `/api/v1`; no ambiente de desenvolvimento, o Vite encaminha `/api` para a API local na porta 3000.

No ambiente público e no local, o Nginx encaminha `/api/` ao serviço `api:3000`. As requisições do Socket.IO são encaminhadas separadamente por `/socket.io/`, preservando o upgrade para WebSocket.

## 5.2 Pipeline de requisição

Uma requisição HTTP percorre, em linhas gerais, as seguintes etapas:

1. Nginx recebe a conexão e encaminha a rota para a API.
2. NestJS aplica os guards globais de autenticação e throttling.
3. A estratégia de autenticação valida o token quando o endpoint exige sessão.
4. Guards e regras do caso de uso verificam o tipo de identidade, papel e propriedade do recurso.
5. O controller transforma a entrada HTTP em parâmetros/DTOs e chama o serviço ou caso de uso.
6. A camada de aplicação coordena regras e contratos de domínio.
7. Adaptadores de infraestrutura executam consultas ou transações Prisma, acessam Redis e chamam serviços externos.
8. A resposta passa pelos filtros de exceção e retorna ao cliente.

O `ValidationPipe` global utiliza `whitelist: true`, `forbidNonWhitelisted: true` e `transform: true`, com conversão implícita habilitada. Portanto, os DTOs constituem o contrato de entrada e campos não reconhecidos não devem ser enviados.

## 5.3 Endpoints de autenticação do paciente

Controller: `AuthController`. Prefixo: `/api/v1/auth`.

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/login/check-realm` | Determina a estratégia de autenticação associada ao e-mail. |
| `POST` | `/register` | Cria conta local, registra os atos legais requeridos e emite tokens. |
| `POST` | `/login` | Valida credenciais locais e inicia sessão. |
| `POST` | `/refresh` | Renova e rotaciona refresh token. |
| `POST` | `/logout` | Revoga o refresh token informado. |
| `GET` | `/google` | Inicia o redirecionamento OAuth. |
| `GET` | `/google/callback` | Recebe o retorno do provedor. |
| `POST` | `/google/exchange` | Consome o código temporário e entrega os tokens. |
| `POST` | `/forgot-password` | Solicita link de redefinição. |
| `POST` | `/reset-password` | Valida token e altera a senha. |

## 5.4 Perfil do paciente

Controller: `PatientsController`. Prefixo: `/api/v1/patients`.

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/me` | Recupera o perfil associado ao usuário autenticado. |
| `PUT` | `/me` | Atualiza os campos permitidos do próprio perfil. |
| `DELETE` | `/me` | Executa a operação de exclusão conforme as regras do backend. |

O identificador do usuário é obtido da identidade autenticada. O cliente não deve escolher livremente outro `userId` para acessar o perfil.

## 5.5 Endpoints clínicos

| Contexto | Método e endpoint | Descrição |
|---|---|---|
| Condições | `GET /conditions` | Lista condições do paciente autenticado. |
| Condições | `POST /conditions` | Registra condição. |
| Condições | `DELETE /conditions/:id` | Remove registro próprio conforme regra de domínio. |
| Medicamentos | `GET /medications` | Lista medicamentos. |
| Medicamentos | `POST /medications` | Registra medicamento. |
| Medicamentos | `PATCH /medications/:id` | Atualiza informações do medicamento. |
| Medicamentos | `DELETE /medications/:id` | Remove registro permitido. |
| Histórico | `GET /medications/:id/history` | Consulta histórico do medicamento. |
| Alergias | `GET /allergies` | Lista alergias. |
| Alergias | `POST /allergies` | Registra alergia. |
| Alergias | `DELETE /allergies/:id` | Remove alergia. |
| Contatos | `GET /emergency-contacts` | Lista contatos. |
| Contatos | `POST /emergency-contacts` | Registra contato. |
| Contatos | `DELETE /emergency-contacts/:id` | Remove contato. |
| Restrições | `GET /forbidden-medications` | Lista restrições. |
| Restrições | `POST /forbidden-medications` | Registra restrição. |
| Restrições | `DELETE /forbidden-medications/:id` | Remove restrição. |
| Catálogo | `GET /disease-dictionary` | Pesquisa doenças. |
| Catálogo | `GET /medications-dictionary` | Pesquisa medicamentos. |

Os endpoints de dados pessoais e clínicos devem validar a identidade e restringir as consultas ao próprio paciente autenticado, exceto operações profissionais explicitamente autorizadas.

## 5.6 Endpoints de emergência

Controller: `EmergencyController`. Prefixo: `/api/v1/emergency`.

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/trigger` | Registra solicitação de emergência. Exige `X-Idempotency-Key`. |
| `GET` | `/` | Lista ocorrências relacionadas ao paciente autenticado. |

A chave de idempotência é obrigatória no acionamento e deve ser um UUID. A mesma chave e o mesmo payload permitem recuperar o resultado original em um retry. Uma chave reutilizada com conteúdo diferente resulta em conflito.

## 5.7 Endpoints da equipe

Os controllers da equipe utilizam prefixo `/api/v1/staff`.

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/auth/me` | Recupera identidade do profissional autenticado. |
| `GET` | `/auth/setup-status` | Consulta estado de provisionamento inicial. |
| `POST` | `/auth/login/check-realm` | Determina método de autenticação. |
| `POST` | `/auth/register` | Provisiona profissional conforme regra de acesso. |
| `POST` | `/auth/login` | Autentica profissional. |
| `GET` | `/emergencies` | Retorna ocorrências recentes. |
| `POST` | `/emergencies/:id/accept` | Assume ocorrência. |
| `POST` | `/emergencies/:id/resolve` | Registra resolução. |
| `POST` | `/emergencies/location` | Atualiza localização operacional do profissional. |
| `GET` | `/patients?cpf=...` | Consulta paciente de acordo com o papel. |

## 5.8 Atos legais e health checks

O módulo legal disponibiliza `POST /api/v1/legal-acts`, `GET /api/v1/legal-acts/holder/:holderId` e `GET /api/v1/legal-acts/actor/:actorId`.

O módulo de saúde disponibiliza:

- `GET /api/v1/health`: verificação geral;
- `GET /api/v1/health/live`: disponibilidade do processo;
- `GET /api/v1/health/started`: inicialização concluída;
- `GET /api/v1/health/ready`: prontidão das dependências necessárias.

O Compose utiliza `/api/v1/health/ready` no healthcheck da API.

## 5.9 CORS, proxy e headers

O CORS é configurado por `CORS_ORIGIN`, com credenciais habilitadas. O `TRUST_PROXY` controla se o Express confia em cabeçalhos encaminhados. Em produção, o valor deve corresponder aos saltos de proxy conhecidos, incluindo o caminho real entre Cloudflare Tunnel, Nginx e API.

Helmet adiciona cabeçalhos de proteção HTTP, e o Nginx define cabeçalhos adicionais para tipo de conteúdo, referrer, framing e permissões. A configuração pública permite geolocalização na própria origem, conforme a diretiva `Permissions-Policy`.

## 5.10 Rate limiting

O throttler global utiliza `THROTTLE_TTL` e `THROTTLE_LIMIT`, com defaults de 60.000 milissegundos e 100 requisições por janela. `RedisThrottlerStorage` fornece contagem compartilhada quando Redis está disponível e possui fallback por processo quando o serviço compartilhado não está ativo. A proteção de rotas sensíveis deve ser avaliada em conjunto com o limite global e a capacidade da infraestrutura.

## 5.11 Contratos de resposta

Clientes devem tratar status HTTP e códigos de erro definidos pelo backend, sem depender apenas da mensagem textual. Entre os resultados relevantes estão:

- `400`/`422`: entrada inválida ou falha de validação;
- `401`: autenticação ausente, inválida, expirada ou token não aceito;
- `403`: identidade autenticada sem permissão para a operação;
- `404`: recurso não localizado no escopo permitido;
- `409`: conflito de estado, concorrência ou idempotência;
- `429`: limite de requisições atingido;
- `5xx`: falha no processamento ou dependência.

Os DTOs específicos e os filtros de exceção da revisão em execução definem o corpo efetivo de cada resposta.
