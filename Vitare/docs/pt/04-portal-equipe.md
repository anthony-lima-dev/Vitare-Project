# 4. Portal de monitoramento da equipe

[🇧🇷 Português (Brasil)](04-portal-equipe.md) | [🇺🇸 English](../en/04-staff-portal.md) | [Índice](00-indice.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 4.1 Responsabilidade e caminho base

O portal está em `apps/web-staff/` e é uma aplicação React + Vite independente. Sua base de publicação é `/monitoramento/`; a configuração Vite define `base: "/monitoramento/"`, e o `BrowserRouter` utiliza `basename="/monitoramento"`.

A equipe possui contexto de autenticação próprio, distinto do contexto do paciente. O portal mantém seu próprio Service Worker e manifesto PWA com escopo `/monitoramento/`.

## 4.2 Rotas

As rotas são declaradas em `apps/web-staff/src/App.tsx`:

| Rota | Finalidade |
|---|---|
| `/monitoramento/` | Entrada da aplicação e verificação de sessão/provisionamento. |
| `/monitoramento/login` | Autenticação de profissional. |
| `/monitoramento/cadastro` | Provisionamento inicial ou cadastro administrativo. |
| `/monitoramento/emergencias` | Feed operacional e ações de atendimento. |
| `/monitoramento/pacientes` | Consulta de paciente autorizada. |

O portal utiliza prefixo relativo à base configurada. O Nginx disponibiliza `/monitoramento` e redireciona para `/monitoramento/`, preservando o caminho esperado pelo Vite e pelo roteador.

## 4.3 PWA da equipe

`apps/web-staff/vite.config.ts` utiliza `vite-plugin-pwa` com estratégia `injectManifest` e o Service Worker `apps/web-staff/public/sw.ts`. O manifesto define `scope`, `start_url` e identificador em `/monitoramento/`, além de ícones próprios.

O cache versionado utiliza o prefixo `vitare-web-staff-`. O Service Worker realiza precache dos recursos do build e da página offline da equipe, aplica network-first à navegação e cache-first aos recursos estáticos. Rotas de API, Socket.IO, autenticação e recursos de autenticação staff são excluídos do cache.

O portal utiliza o Service Worker para manter a aplicação shell e recursos estáticos acessíveis. As ações de aceitar, resolver e consultar prontuário são operações de backend e exigem conectividade com a API.

## 4.4 Autenticação e papéis

A entidade `Staff` representa os profissionais. O fluxo da equipe utiliza endpoints próprios em `/api/v1/staff/auth` e tokens assinados com `STAFF_JWT_SECRET`. O token inclui o tipo de identidade `staff`; guards e estratégias específicas verificam o contexto profissional.

Os papéis disponíveis são `MEDICO_SOCORRISTA`, `ENFERMEIRO_SOCORRISTA`, `TECNICO_ENFERMAGEM`, `OPERADOR_TACTICAL` e `ADMINISTRATIVO`. As permissões são aplicadas no backend, independentemente dos elementos apresentados na interface.

## 4.5 Feed de emergências

O feed é obtido por `GET /api/v1/staff/emergencies`. O frontend utiliza TanStack Query, com chave `staff-emergencies`, limite usual de 50 ocorrências e atualização periódica a cada 15 segundos.

Em paralelo, o cliente Socket.IO conecta-se à API utilizando a sessão da equipe. O gateway valida o token e associa a conexão à sala operacional autorizada. Quando o frontend recebe um evento, invalida a consulta do feed; a leitura seguinte ocorre por REST, que retorna o estado persistido mais recente.

O canal Socket.IO serve para notificar mudanças. A API REST e o PostgreSQL continuam sendo a referência para consultar os dados atuais da ocorrência.

## 4.6 Aceite de uma ocorrência

O profissional seleciona uma ocorrência e solicita aceite por `POST /api/v1/staff/emergencies/:id/accept`. A API identifica o profissional pela sessão, verifica as condições de estado e executa a atribuição de forma condicional. A atualização condicional impede que duas requisições concorrentes atribuam a mesma ocorrência a profissionais diferentes.

Após a resposta, o portal revalida o feed para refletir a atribuição confirmada. O identificador do profissional não deve ser recebido livremente do navegador; o backend obtém a identidade do token validado.

## 4.7 Resolução

A resolução é solicitada por `POST /api/v1/staff/emergencies/:id/resolve`. O caso de uso verifica se a ocorrência está em estado elegível e se o profissional autenticado é o responsável atribuído. A operação registra o instante de resolução e altera o estado para `RESOLVED`.

## 4.8 Localização operacional

`POST /api/v1/staff/emergencies/location` recebe as coordenadas do profissional autenticado. O adaptador `RedisStaffGeoAdapter` utiliza comandos GEO do Redis e um registro de frescor com TTL. O exemplo de configuração usa 300 segundos para a validade da posição; o raio operacional configurado no exemplo é 5.000 metros.

A localização é um dado operacional e deve ser utilizada de acordo com as permissões e a finalidade definidas para a equipe.

## 4.9 Consulta por CPF

O portal disponibiliza consulta em `/api/v1/staff/patients?cpf=...`. A API autentica o profissional, verifica o papel e normaliza o CPF. O repositório consulta o índice cego HMAC associado ao CPF, sem utilizar o valor original como chave de busca.

A consulta completa é permitida aos papéis médico socorrista, enfermeiro socorrista, técnico de enfermagem e administrativo. `OPERADOR_TACTICAL` não possui acesso ao prontuário completo pelo caso de uso atual.

Os resultados operacionais da consulta distinguem paciente encontrado (`FOUND`), não encontrado (`NOT_FOUND`) e tentativa negada (`DENIED`). O registro de auditoria é executado pelo adaptador `PatientLookupAuditPort`.

## 4.10 Provisionamento de profissionais

`GET /api/v1/staff/auth/setup-status` informa se a primeira conta da equipe ainda precisa ser criada. O primeiro cadastro utiliza `STAFF_BOOTSTRAP_KEY`, transmitida pelo header `X-Bootstrap-Key`. O repositório coordena a criação inicial para evitar que duas solicitações reivindiquem simultaneamente a primeira conta.

Depois do provisionamento inicial, o cadastro de novos profissionais exige um administrador autenticado. A chave de bootstrap deve permanecer protegida e ser administrada como segredo operacional.
