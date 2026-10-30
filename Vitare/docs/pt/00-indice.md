# Documentação técnica do Vitare 2026

[🇧🇷 Português (Brasil)](00-indice.md) | [🇺🇸 English](../en/00-index.md) | [README do projeto](../../README.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

Esta documentação descreve o funcionamento do Vitare com base na implementação do monorepositório, nos arquivos de infraestrutura e nos materiais técnicos disponibilizados para compreensão dos processos e das regras de negócio.

## Navegação

1. [Visão geral](01-visao-geral.md) — finalidade, atores, responsabilidades e escopo do produto.
2. [Arquitetura](02-arquitetura.md) — monorepositório, camadas, módulos e comunicação entre componentes.
3. [Aplicação do paciente](03-aplicacao-paciente.md) — rotas, perfil, dados clínicos e PWA.
4. [Portal da equipe](04-portal-equipe.md) — autenticação profissional, feed, atendimento e consulta clínica.
5. [API REST](05-api.md) — endpoints, validação, contratos e controles transversais.
6. [Identidade e sessões](06-identidade-sessoes.md) — cadastro, autenticação local/Google, tokens e recuperação de senha.
7. [Domínio clínico](07-dominio-clinico.md) — prontuário, condições, medicamentos, alergias, contatos e catálogos.
8. [Emergências](08-emergencias.md) — acionamento, snapshot, atribuição e ciclo de atendimento.
9. [Operação offline](09-offline-sincronizacao.md) — IndexedDB, cache, fila local, idempotência e publicação assíncrona.
10. [Tempo real e Redis](10-tempo-real-redis.md) — Socket.IO, feed, localização e funções do Redis.
11. [Modelo de dados](11-modelo-dados.md) — entidades, relações, constraints, Prisma e PostgreSQL.
12. [Segurança e privacidade](12-seguranca-privacidade.md) — autenticação, autorização, criptografia, auditoria e LGPD.
13. [Infraestrutura pública](13-infraestrutura-publica.md) — Cloudflare Tunnel, Nginx, Docker Compose e publicação.
14. [Infraestrutura local](14-infraestrutura-local.md) — ambiente de desenvolvimento e demonstração em LAN.
15. [Configuração](15-configuracao.md) — variáveis de ambiente, URLs, chaves e parâmetros.
16. [Operação e recuperação](16-operacao-backup.md) — healthchecks, logs, backup, restauração e manutenção.
17. [Desenvolvimento e testes](17-desenvolvimento-testes.md) — instalação, execução, build e validação.

## Convenções

- **Implementação:** comportamento identificado diretamente no código ou em configuração versionada.
- **Configuração:** comportamento definido por variáveis de ambiente, credenciais, rede, DNS ou provisionamento.
- **Procedimento:** sequência operacional para executar uma tarefa no ambiente local ou público.

A documentação descreve a versão do projeto fornecida para análise. Antes de atualizar uma branch, compare as alterações de código, schema, migrações e Compose e ajuste os documentos correspondentes.

## Organização da leitura

A leitura recomendada começa pela visão geral e arquitetura. Em seguida, consulte as páginas das duas aplicações e os fluxos de identidade e emergência. Os documentos de dados, segurança e infraestrutura detalham as bases persistentes e a operação da plataforma. A implantação pública é o caminho prioritário para disponibilização externa; `infra/local/` é destinado a desenvolvimento integrado e demonstrações controladas.
