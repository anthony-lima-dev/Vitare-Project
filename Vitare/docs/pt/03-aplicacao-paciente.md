# 3. Aplicação do paciente

[🇧🇷 Português (Brasil)](03-aplicacao-paciente.md) | [🇺🇸 English](../en/03-patient-application.md) | [Índice](00-indice.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 3.1 Responsabilidade

A aplicação do paciente está em `apps/web/` e utiliza React, TypeScript, Vite e React Router. Seu objetivo é oferecer ao usuário uma área autenticada para administrar o perfil e as informações clínicas, consultar catálogos e registrar uma solicitação de emergência.

A comunicação com o backend utiliza o cliente HTTP da aplicação e, no build padrão, a origem relativa `/api/v1`. Em desenvolvimento, o Vite encaminha `/api` para `http://localhost:3000`.

## 3.2 Rotas principais

As rotas são declaradas em `apps/web/src/App.tsx`.

| Rota | Finalidade |
|---|---|
| `/` | Página inicial pública. |
| `/login` | Autenticação do paciente. |
| `/cadastro` | Cadastro local ou início do fluxo Google. |
| `/esqueci-senha` | Solicitação de recuperação de acesso. |
| `/auth/reset-password` | Redefinição de senha por token. |
| `/auth/google/callback` | Retorno do fluxo OAuth Google. |
| `/dashboard` | Resumo da área do paciente. |
| `/completar-cadastro` | Complementação do perfil e onboarding. |
| `/medicamentos` | Gestão de medicamentos utilizados e histórico. |
| `/doencas-cronicas` | Gestão de condições crônicas. |
| `/alergias` | Gestão de alergias. |
| `/contatos-emergencia` | Gestão de contatos de emergência. |
| `/perfil` | Dados do perfil e ações de sessão. |

As páginas autenticadas são envolvidas por `ProtectedRoute`. As rotas antigas `/minha-saude/doencas-cronicas` e `/minha-saude/alergias` redirecionam para os caminhos atuais, preservando compatibilidade com links anteriores.

## 3.3 Perfil do paciente

O perfil está associado ao modelo `User`. A aplicação permite administrar dados identificadores e atributos pessoais relevantes, como tipo sanguíneo, peso e altura. Os dados identificadores são enviados à API para proteção e persistência; a interface trabalha com os valores necessários à experiência do usuário.

A sessão mantém a identidade do paciente autenticado. O cache de leitura do IndexedDB é separado por escopo de usuário, evitando que uma resposta armazenada para uma conta seja utilizada por outra após mudança de sessão.

## 3.4 Informações clínicas

As seções clínicas são organizadas por finalidade:

- **Condições crônicas:** registros associados ao paciente e ao catálogo de doenças.
- **Medicamentos:** nome, dose, frequência, período de utilização, notas e indicador de atividade.
- **Histórico de medicamentos:** alterações relevantes realizadas nos registros de medicamentos.
- **Alergias:** substância ou descrição, gravidade e observações.
- **Medicamentos proibidos/restritos:** restrições associadas a itens do catálogo de medicamentos.
- **Contatos de emergência:** nome, telefone, relacionamento e indicação de contato principal.

A frequência de uso é armazenada no atributo `frequency` do medicamento. O modelo de schedules separado foi removido pela migração `20261005180000_remove_medication_schedules`; o formato vigente não depende de uma tabela adicional de horários.

## 3.5 Catálogos de referência

O frontend consulta os endpoints de pesquisa de doenças e medicamentos. Os catálogos são carregados no backend a partir de arquivos JSON versionados em `apps/api/prisma/data/`. A seleção de um item de catálogo é utilizada para estruturar o registro clínico; a disponibilidade de um item no catálogo não constitui prescrição ou recomendação terapêutica.

## 3.6 PWA do paciente

O Vite configura `vite-plugin-pwa` com estratégia `injectManifest` e Service Worker próprio em `apps/web/public/sw.ts`. O registro do Service Worker é realizado pelo componente `SWRegister`, incluído no entrypoint da aplicação.

O manifesto define:

- nome e nome curto da aplicação;
- descrição e cores do tema;
- modo de exibição `standalone`;
- orientação preferencial retrato;
- escopo `/` e endereço inicial `/`;
- ícones em diferentes tamanhos, incluindo versões maskable.

O Service Worker utiliza cache versionado `vitare-web-v1`, precache dos recursos do build e da página `/offline.html`. Para navegação, utiliza estratégia network-first e, quando não há rede, tenta servir a página já armazenada ou a página offline. Para assets estáticos, utiliza cache-first.

As rotas `/api/`, `/monitoramento/`, `/socket.io/`, `/auth/` e `/emergency/` são excluídas das estratégias locais. Respostas clínicas autenticadas e tokens não são colocados no Cache Storage.

## 3.7 Cache de leitura no IndexedDB

O banco `vitare-pwa-cache` possui stores para respostas e operações da outbox. O cache de leitura armazena respostas GET selecionadas, associadas a um escopo de usuário e a timestamps de validade. Entre os recursos abrangidos estão perfil e dados clínicos necessários para exibição.

A política é network-first: a resposta atual da API tem prioridade; a cópia local pode ser utilizada como apoio quando a rede falha, desde que continue dentro do período de validade. Respostas de autenticação negada ou recurso inexistente não devem ser substituídas por conteúdo obsoleto. O escopo de usuário permite limpar os dados locais quando a conta muda ou a sessão é encerrada.

## 3.8 Solicitação de emergência

O botão de emergência aciona o caso de uso `triggerEmergency`, localizado na camada de aplicação do frontend. O caso de uso recebe portas para geolocalização e outbox, sem depender diretamente de componentes React.

A geolocalização é solicitada com timeout de 15 segundos e `maximumAge: 0`. As coordenadas são validadas antes de integrar o payload. Se a localização não puder ser obtida, a interface pergunta se o paciente deseja continuar sem coordenadas. A confirmação mantém o fluxo; o cancelamento não cria a operação.

O payload do frontend contém `clientTriggeredAt` e latitude/longitude quando disponíveis. A operação é gravada na outbox IndexedDB antes do envio à API. Após confirmação do servidor, a entrada local é marcada como `SYNCED` e pode armazenar o identificador da ocorrência retornada.

## 3.9 Contexto seguro

A instalação PWA, o Service Worker e a geolocalização dependem de contexto seguro, normalmente HTTPS. Em ambiente local/LAN, o certificado deve ser confiável no dispositivo que acessa a aplicação. A infraestrutura local fornece um procedimento para gerar certificados de desenvolvimento.
