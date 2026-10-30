# 8. Acionamento e processamento de emergências

[🇧🇷 Português (Brasil)](08-emergencias.md) | [🇺🇸 English](../en/08-emergencies.md) | [Índice](00-indice.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 8.1 Início do acionamento

O fluxo começa na aplicação do paciente, por meio da ação de emergência. A interface chama o caso de uso `triggerEmergency`, que coordena a captura de localização e a gravação da solicitação na outbox local.

A localização é opcional. O navegador solicita posição atual com timeout configurado; as coordenadas são verificadas no domínio antes de serem adicionadas ao payload. Se a captura não for possível, a interface pode solicitar autorização do paciente para continuar sem localização.

O payload padrão contém `clientTriggeredAt` e, quando disponível, `latitude` e `longitude`. O frontend não precisa enviar o registro clínico inteiro para o endpoint de acionamento: o backend pode consultar as informações persistidas do próprio paciente para compor o snapshot associado à ocorrência.

## 8.2 Persistência local antes do envio

A aplicação grava a operação no IndexedDB com:

- identificador local da operação;
- `ownerId` do paciente autenticado;
- payload do acionamento;
- chave de idempotência;
- estado inicial `QUEUED`;
- contador de tentativas;
- datas de criação e tentativa;
- próximo instante elegível;
- último erro, quando houver.

Essa gravação permite manter a operação no dispositivo até que a API confirme seu registro. A mesma chave de idempotência é reutilizada nas novas tentativas da mesma operação lógica.

## 8.3 Requisição à API

O sincronizador envia `POST /api/v1/emergency/trigger` e inclui `X-Idempotency-Key`. O guard global valida a sessão do paciente antes que o controller encaminhe os dados ao caso de uso `TriggerEmergencyUseCase`.

O caso de uso verifica:

1. presença da chave de idempotência;
2. formato UUID da chave;
3. envio conjunto de latitude e longitude;
4. intervalo geográfico válido das coordenadas;
5. fingerprint do conteúdo da requisição;
6. origem dos dados do snapshot clínico.

A validação impede que latitude ou longitude sejam enviadas isoladamente e que coordenadas fora dos intervalos válidos sejam aceitas.

## 8.4 Formação do snapshot clínico

Quando o payload não contém um snapshot fornecido pelo cliente, o backend consulta a fonte de dados clínicos do paciente dentro do fluxo de aplicação e monta `PatientSnapshot`. A fotografia inclui o contexto disponível para a ocorrência no instante do recebimento pelo servidor, junto de informações temporais do acionamento.

Quando um snapshot é recebido do cliente, o caso de uso aplica uma construção baseada em campos permitidos e identifica a origem do conteúdo como fornecida pelo cliente. Essa distinção permite interpretar corretamente a procedência dos dados.

O snapshot é associado à ocorrência e permite que a equipe consulte o contexto clínico correspondente ao momento do acionamento, mesmo que o perfil seja atualizado posteriormente.

## 8.5 Transação e idempotência

`PrismaIdempotencyStore` implementa idempotência persistente no PostgreSQL. A combinação de usuário, escopo e chave é única. O fingerprint da requisição é calculado e armazenado com o estado e o payload de resposta.

No primeiro envio, o serviço abre uma transação que:

1. cria o registro de idempotência em `IN_PROGRESS`;
2. executa a operação de negócio;
3. cria a ocorrência;
4. grava o evento de outbox relacionado;
5. armazena o resultado idempotente em `COMPLETED`;
6. confirma a transação.

Se a mesma chave for repetida com o mesmo fingerprint, o sistema recupera o resultado anterior e indica replay. Se o conteúdo diferir, o serviço retorna conflito de idempotência. Assim, a repetição de uma chamada após timeout não precisa criar uma segunda ocorrência.

## 8.6 Registro da ocorrência

O modelo `EmergencyEvent` contém:

- identificador UUID;
- `userId` do paciente;
- instante `triggeredAt`;
- latitude e longitude opcionais;
- snapshot clínico;
- estado operacional;
- observações;
- `assignedStaffId` opcional;
- instante de aceite;
- instante de resolução.

A ocorrência inicial recebe estado `TRIGGERED`. O registro do paciente é mantido por relação obrigatória com `User`; a atribuição ao profissional é opcional até o aceite.

## 8.7 Ciclo de atendimento

O ciclo funcional da ocorrência utiliza os estados `TRIGGERED`, `NOTIFIED`, `ACCEPTED` e `RESOLVED`.

| Estado | Significado |
|---|---|
| `TRIGGERED` | A ocorrência foi persistida após o acionamento. |
| `NOTIFIED` | O evento operacional foi publicado e a ocorrência recebeu a atualização correspondente. |
| `ACCEPTED` | Um profissional assumiu a ocorrência e foi associado ao registro. |
| `RESOLVED` | O profissional responsável registrou a conclusão do atendimento. |

O dispatcher pode atualizar uma ocorrência de `TRIGGERED` para `NOTIFIED` após a publicação. O aceite associa o profissional e registra `acceptedAt`. A resolução registra `resolvedAt` e altera o estado para `RESOLVED`.

As atualizações são condicionadas ao estado atual e à identidade autenticada para preservar a atribuição e a ordem do atendimento.

## 8.8 Aceite e resolução pela equipe

O aceite ocorre por `POST /api/v1/staff/emergencies/:id/accept`. O backend valida o profissional, o estado atual e executa atualização condicional para atribuir a ocorrência.

A resolução ocorre por `POST /api/v1/staff/emergencies/:id/resolve`. O caso de uso verifica se o estado é `ACCEPTED` e se o profissional autenticado corresponde ao responsável atribuído. A API persiste o estado final antes que o portal revalide o feed.

## 8.9 Publicação operacional

A criação da ocorrência e a publicação Socket.IO são fases separadas. A resposta HTTP confirma o resultado da transação de negócio. O dispatcher consome a outbox posteriormente e emite um evento operacional por meio de `EmergencyGateway`.

Os eventos incluem identificador próprio (`eventId`) para permitir deduplicação do lado do consumidor. O payload é operacional; a equipe consulta os dados atuais por REST, com autorização aplicada no servidor.

## 8.10 Situação apresentada ao paciente

A experiência deve diferenciar operação salva no dispositivo, envio aguardando sincronização, registro confirmado pela API e estado operacional posterior. O identificador `serverEventId` é preenchido quando a resposta confirma a ocorrência no servidor. A publicação para a equipe e o aceite são eventos posteriores, consultados por meio da atualização do estado.
