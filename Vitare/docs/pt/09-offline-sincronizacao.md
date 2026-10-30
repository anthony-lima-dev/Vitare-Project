# 9. Operação offline, IndexedDB e sincronização

[🇧🇷 Português (Brasil)](09-offline-sincronizacao.md) | [🇺🇸 English](../en/09-offline-synchronization.md) | [Índice](00-indice.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 9.1 Recursos locais distintos

A estratégia offline do Vitare combina mecanismos diferentes:

1. **Cache Storage:** recursos estáticos e páginas da aplicação mantidos pelo Service Worker.
2. **Cache de leitura IndexedDB:** respostas GET selecionadas da área do paciente, com escopo e validade.
3. **Outbox local IndexedDB:** operações de emergência persistidas até confirmação da API.
4. **Outbox transacional PostgreSQL:** eventos de negócio registrados na transação da ocorrência e processados posteriormente.

O cache estático do Service Worker não é um repositório clínico. A outbox local do paciente também não é compartilhada com a aplicação da equipe.

## 9.2 Cache Storage e Service Worker

O Service Worker do paciente utiliza o prefixo de cache `vitare-web-`; o Service Worker da equipe utiliza `vitare-web-staff-`. Cada um limpa apenas caches associados ao próprio prefixo, preservando o escopo da outra aplicação.

Ambos utilizam network-first para navegação e cache-first para assets estáticos. Recursos de API e autenticação são excluídos das estratégias de cache. O Service Worker não implementa Background Sync nativo; a aplicação inicia a sincronização por eventos de conectividade, visibilidade e execução do cliente.

## 9.3 IndexedDB

A aplicação do paciente utiliza o banco `vitare-pwa-cache`, versão 2, com stores `responses` e `outbox`.

A store `responses` contém elementos como:

- chave local do registro;
- escopo do usuário;
- URL correspondente;
- instante de armazenamento;
- instante de expiração;
- resposta estruturada.

A store `outbox` possui índices por `ownerId`, estado e chave de idempotência. Essa organização permite recuperar operações de um usuário específico, filtrar registros por situação e garantir unicidade da chave no armazenamento local.

## 9.4 Estados da outbox local

Cada operação de emergência possui estado próprio:

| Estado | Significado |
|---|---|
| `QUEUED` | Solicitação persistida e aguardando sincronização. |
| `SYNCING` | Operação reivindicada por uma tentativa de envio. |
| `SYNCED` | API confirmou o registro da ocorrência. |
| `RETRY_WAIT` | Falha temporária; nova tentativa será realizada após o intervalo calculado. |
| `FAILED_PERMANENT` | Falha classificada como não retentável automaticamente. |

A operação `SYNCING` utiliza um lease local com tempo aproximado de 30 segundos. Uma sincronização interrompida pode ser retomada a partir do registro persistido, reutilizando a mesma chave idempotente.

## 9.5 Política de repetição

A implementação define até cinco tentativas, backoff exponencial e variação de intervalo, com teto de 60 segundos. A fila diferencia os tipos de falha para escolher o comportamento de repetição:

- falhas de rede e timeout: nova tentativa;
- operação idêntica ainda em processamento no servidor: nova tentativa;
- chave repetida com conteúdo divergente: encerramento automático;
- chave ausente ou fora do formato exigido: encerramento automático;
- validação do payload classificada pelo backend como erro de entrada: encerramento automático;
- respostas de autenticação: podem ser novamente processadas depois da renovação ou reautenticação do usuário.

O contador de tentativas e `nextAttemptAt` determinam a elegibilidade de cada operação.

## 9.6 Isolamento por usuário

Todas as consultas de sincronização filtram por `ownerId`. O token utilizado para enviar uma operação deve pertencer ao mesmo usuário registrado no item local. Durante logout ou troca de conta, os dados locais são limpos conforme o escopo de sessão, e as operações do usuário anterior não devem ser enviadas com credenciais de outro usuário.

## 9.7 Fluxo de sincronização

1. O paciente confirma a solicitação.
2. O frontend cria uma chave idempotente e persiste a operação como `QUEUED`.
3. O sincronizador recupera operações elegíveis do proprietário autenticado.
4. A operação é marcada `SYNCING` antes da chamada HTTP.
5. O cliente envia o payload com `X-Idempotency-Key`.
6. A API persiste ou recupera o resultado anterior.
7. Com resposta confirmada, a operação é marcada `SYNCED` e recebe o ID retornado pelo servidor.
8. Em falha temporária, a operação passa para `RETRY_WAIT` e recebe um novo horário de tentativa.
9. Em falha permanente ou esgotamento da política de tentativa, a operação é marcada `FAILED_PERMANENT`.

## 9.8 Idempotência entre dispositivo e servidor

A chave é criada uma única vez para a operação lógica. O frontend reutiliza a mesma chave em todas as tentativas. O backend combina usuário, escopo e chave em uma constraint única e compara o fingerprint do payload.

Esse mecanismo integra a persistência local com a transação do servidor. Se a conexão cair depois de o banco confirmar o commit, o retry com a mesma chave recupera a resposta armazenada sem gerar outra ocorrência.

## 9.9 Outbox transacional do servidor

A outbox do servidor é persistida no PostgreSQL. A criação do `OutboxEvent` ocorre na mesma transação que registra a ocorrência e o resultado idempotente. O estado inicial é `PENDING`.

O `OutboxDispatcher` executa em ciclo periódico:

1. consulta eventos `PENDING` por ordem de criação;
2. reivindica um lote e altera os registros para `PROCESSING`;
3. define prazo de processamento e incrementa contador;
4. tenta adquirir lock Redis por evento;
5. publica o evento pelo `EmergencyGateway`;
6. marca o registro como `PUBLISHED`;
7. para eventos de acionamento, solicita a atualização da ocorrência para `NOTIFIED`.

O estado `FAILED` representa uma publicação que alcançou o limite de tentativas configurado. A ocorrência de negócio permanece registrada de forma independente do estado da publicação.

## 9.10 Diferença entre as filas

| Característica | Outbox local | Outbox do servidor |
|---|---|---|
| Persistência | IndexedDB do dispositivo | PostgreSQL |
| Proprietário | Paciente autenticado | Aplicação/backend |
| Finalidade | Entregar a solicitação à API | Publicar eventos após o commit |
| Chave | Idempotency key da operação | ID do evento persistido |
| Confirmação | Resposta válida da API | Publicação executada pelo dispatcher |
| Estados | `QUEUED`, `SYNCING`, `SYNCED`, `RETRY_WAIT`, `FAILED_PERMANENT` | `PENDING`, `PROCESSING`, `PUBLISHED`, `FAILED` |

As duas filas integram o mesmo processo de negócio, mas possuem armazenamento, estados, consumidores e responsabilidades distintos.
