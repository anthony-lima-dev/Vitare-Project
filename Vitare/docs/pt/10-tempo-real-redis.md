# 10. Comunicação em tempo real e Redis

[🇧🇷 Português (Brasil)](10-tempo-real-redis.md) | [🇺🇸 English](../en/10-realtime-redis.md) | [Índice](00-indice.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 10.1 Gateway Socket.IO

O módulo de emergência registra `EmergencyGateway`, responsável por disponibilizar eventos operacionais pelo Socket.IO. A conexão do portal staff utiliza o token de autenticação da equipe no handshake. O gateway valida a assinatura e o tipo do token, consulta o estado de bloqueio da identidade e associa a conexão à sala operacional autorizada.

Os eventos relacionados ao ciclo de vida da ocorrência incluem:

- `emergency.triggered`;
- `emergency.accepted`;
- `emergency.resolved`.

O dispatcher inclui o identificador do evento (`eventId`) no payload, permitindo que consumidores reconheçam uma repetição. O conteúdo transmitido é operacional e não substitui a consulta autorizada do prontuário pela API REST.

## 10.2 Atualização do feed

O portal carrega o feed pela API REST em `GET /api/v1/staff/emergencies`. O frontend utiliza TanStack Query para manter o resultado em cache e atualizá-lo periodicamente.

Quando um evento Socket.IO é recebido, o cliente invalida a consulta `staff-emergencies`. A próxima leitura REST obtém o estado persistido mais recente. O polling a cada 15 segundos complementa a atualização por eventos e permite que o portal reconcilie os dados quando a conexão realtime é interrompida.

## 10.3 Papel do Redis

Redis é utilizado como infraestrutura auxiliar para diferentes operações:

| Uso | Finalidade |
|---|---|
| Cache | Reutilização de resultados selecionados com TTL. |
| Locks | Coordenação de publicação de eventos da outbox. |
| Throttling | Contadores compartilhados de requisições, quando habilitados. |
| Estado temporário de autenticação/conexão | Consulta de bloqueios e coordenação operacional conforme módulo. |
| GEO | Armazenamento e consulta de coordenadas recentes da equipe. |

A aplicação utiliza `REDIS_URL` para conexão e `REDIS_KEY_PREFIX` para organizar as chaves. A indisponibilidade do Redis é tratada pelos adaptadores de acordo com a responsabilidade de cada serviço.

## 10.4 Localização dos profissionais

O endpoint `POST /api/v1/staff/emergencies/location` recebe latitude e longitude do profissional autenticado. O identificador do profissional é obtido da identidade validada pelo backend.

`RedisStaffGeoAdapter` utiliza operações GEO para adicionar e consultar posições. Um registro auxiliar por profissional mantém o instante de atualização e TTL. A configuração de referência usa `STAFF_GEO_TTL_SECONDS=300`; a consulta de proximidade utiliza o raio configurado por `EMERGENCY_SEARCH_RADIUS_M`, com 5.000 metros no exemplo.

A posição possui caráter temporal: o timestamp e o TTL permitem determinar se o ponto continua dentro da janela operacional prevista.

## 10.5 Localização do paciente

As coordenadas do paciente são enviadas no payload da ocorrência quando a permissão do navegador e o dispositivo permitem a captura. Elas são persistidas na ocorrência em latitude e longitude, com precisão decimal definida no schema.

A localização do paciente e a localização do profissional possuem origens, finalidades e regras de acesso diferentes. O feed operacional pode utilizar o ponto da ocorrência para orientar o atendimento, enquanto a posição recente da equipe é obtida por meio do recurso GEO.

## 10.6 Redes e acesso

Na infraestrutura pública, Redis está na rede Docker `data`, declarada `internal: true`, e não publica porta no host. A API acessa o Redis pelo hostname definido no Compose. No ambiente local, Redis também permanece sem mapeamento de porta para o host.

## 10.7 Eventos e fonte persistente

A transmissão Socket.IO é orientada a eventos e atua como mecanismo de atualização da interface. Para obter o estado integral da ocorrência, o portal realiza leitura REST depois de receber a sinalização. PostgreSQL conserva os estados de negócio e os registros da outbox; Redis apoia operações temporárias e coordenação entre processos.
