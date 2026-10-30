# 1. Visão geral

[🇧🇷 Português (Brasil)](01-visao-geral.md) | [🇺🇸 English](../en/01-overview.md) | [Índice](00-indice.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 1.1 Finalidade

O Vitare é uma plataforma web para organizar informações clínicas fornecidas por pacientes e apoiar o registro e o acompanhamento interno de solicitações de emergência. A solução possui uma aplicação destinada ao paciente, um portal destinado aos profissionais da equipe e uma API responsável por centralizar regras de negócio, autenticação, autorização, persistência e comunicação operacional.

As duas aplicações frontend são desenvolvidas com React, TypeScript e Vite. Ambas possuem recursos PWA próprios. O backend utiliza NestJS, TypeScript e Prisma ORM; os dados são persistidos em PostgreSQL. Redis oferece recursos auxiliares de cache, localização GEO, bloqueios distribuídos e controle de taxa de requisições. Socket.IO transporta notificações operacionais da API para os clientes da equipe.

## 1.2 Atores e responsabilidades

**Paciente (`User`).** Cria e acessa a própria conta; mantém dados de perfil, condições crônicas, medicamentos utilizados, alergias, restrições medicamentosas e contatos de emergência. Pode iniciar uma solicitação de emergência e acompanhar o registro correspondente.

**Profissional da equipe (`Staff`).** Acessa o portal de monitoramento de acordo com seu papel. Consulta o feed de ocorrências, visualiza detalhes operacionais, assume ocorrências, registra resolução e, quando autorizado, consulta o prontuário do paciente.

**Administrador.** Executa operações administrativas autorizadas, incluindo o provisionamento de profissionais depois da criação da primeira conta.

**Serviços externos.** Google fornece a autenticação federada do paciente; Resend é utilizado para o envio de e-mails; Cloudflare disponibiliza DNS, proxy e Tunnel para a publicação pública.

## 1.3 Papéis profissionais

O enum `StaffRole` contém:

| Papel | Responsabilidade funcional |
|---|---|
| `MEDICO_SOCORRISTA` | Acesso operacional e consulta clínica autorizada. |
| `ENFERMEIRO_SOCORRISTA` | Acesso operacional e consulta clínica autorizada. |
| `TECNICO_ENFERMAGEM` | Acesso operacional e consulta clínica autorizada. |
| `OPERADOR_TACTICAL` | Monitoramento operacional conforme permissões, sem acesso ao prontuário completo por CPF. |
| `ADMINISTRATIVO` | Administração e consulta clínica autorizada. |

A autorização é aplicada no backend. A ocultação de um botão ou rota no frontend não substitui a verificação de papel e identidade no endpoint correspondente.

## 1.4 Áreas funcionais

1. **Identidade e acesso:** cadastro local ou Google, autenticação, sessões, renovação de tokens e recuperação de senha.
2. **Perfil clínico:** dados de perfil, condições crônicas, medicamentos, histórico de alterações, alergias, restrições e contatos.
3. **Catálogos:** pesquisas em bases estruturadas de doenças e medicamentos.
4. **Emergência:** captura opcional de localização, persistência do pedido, controle de idempotência, registro da ocorrência e acompanhamento dos estados.
5. **Monitoramento:** feed de ocorrências, atualização por eventos em tempo real, aceite, resolução e consulta autorizada.
6. **Governança:** registros de atos legais, auditoria de consulta clínica e armazenamento protegido de identificadores.

## 1.5 Limite do serviço

O Vitare implementa um fluxo operacional próprio: o paciente registra uma ocorrência e a API a disponibiliza para o portal interno da equipe. A publicação de uma ocorrência no Vitare não representa, por si só, o acionamento de um serviço público de emergência. A plataforma não substitui avaliação clínica, atendimento profissional nem os canais públicos oficiais.

Em uma operação real, o processo institucional deve definir a relação entre o monitoramento interno e os serviços externos competentes. A disponibilidade do sistema, a conectividade e o estado exibido ao usuário devem ser comunicados de forma inequívoca.

## 1.6 Confirmações do processo de emergência

As etapas possuem significados distintos:

- **Persistência local:** a solicitação foi gravada no dispositivo do paciente.
- **Confirmação da API:** a ocorrência foi registrada no PostgreSQL, conforme a transação e a resposta do endpoint.
- **Publicação operacional:** o dispatcher emitiu o evento pelo Socket.IO.
- **Aceite:** um profissional assumiu a ocorrência.
- **Resolução:** o profissional responsável registrou o encerramento.

A interface deve distinguir essas etapas. O armazenamento local não confirma gravação no servidor, e a emissão de um evento não equivale à leitura humana pela equipe.

## 1.7 Componentes do produto

| Componente | Finalidade |
|---|---|
| `apps/web` | Interface do paciente e recursos PWA correspondentes. |
| `apps/web-staff` | Interface da equipe e recursos PWA sob `/monitoramento/`. |
| `apps/api` | API, casos de uso, integrações e persistência. |
| `packages/core-typings` | Tipos e contratos compartilhados. |
| `packages/ui-components` | Componentes de interface compartilhados. |
| `infra/public` | Stack de publicação pública. |
| `infra/local` | Stack local para desenvolvimento e demonstração. |
