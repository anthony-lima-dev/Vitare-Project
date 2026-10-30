# 11. Modelo de dados e persistência

[🇧🇷 Português (Brasil)](11-modelo-dados.md) | [🇺🇸 English](../en/11-data-model.md) | [Índice](00-indice.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 11.1 Visão geral

O banco relacional do Vitare utiliza PostgreSQL e é declarado por `apps/api/prisma/schema.prisma`. O arquivo contém 18 modelos persistidos e quatro enums. As migrações versionadas em `apps/api/prisma/migrations/` definem a evolução da estrutura ao longo das versões.

Os modelos são mapeados para tabelas PostgreSQL por `@@map`, enquanto os atributos podem ser mapeados para colunas por `@map`. A aplicação usa identificadores UUID, constraints de unicidade, índices e relações definidas por `@relation`.

## 11.2 Modelos persistidos

| Modelo Prisma | Tabela física | Finalidade |
|---|---|---|
| `User` | `users` | Identidade, perfil e dados do paciente. |
| `ChronicCondition` | `chronic_conditions` | Condições crônicas associadas ao paciente. |
| `Medication` | `medications` | Medicamentos utilizados pelo paciente. |
| `MedicationHistory` | `medication_history` | Histórico de alterações de medicamentos. |
| `EmergencyContact` | `emergency_contacts` | Contatos de emergência. |
| `EmergencyEvent` | `emergency_events` | Ocorrências e ciclo de atendimento. |
| `IdempotencyRecord` | `idempotency_records` | Chaves e resultados de operações idempotentes. |
| `OutboxEvent` | `outbox_events` | Eventos a publicar após a transação de negócio. |
| `RefreshToken` | `refresh_tokens` | Hashes e validade de refresh tokens. |
| `PasswordResetToken` | `password_reset_tokens` | Hashes e validade de tokens de recuperação. |
| `DiseaseDictionary` | `disease_dictionary` | Catálogo de doenças. |
| `DiseaseGroup` | `disease_groups` | Agrupamentos por intervalos de códigos. |
| `MedicationsDictionary` | `medications_dictionary` | Catálogo de medicamentos. |
| `Allergy` | `allergies` | Alergias registradas pelo paciente. |
| `ForbiddenMedication` | `forbidden_medications` | Restrições a medicamentos do catálogo. |
| `Staff` | `staff` | Identidade e papel dos profissionais. |
| `PatientLookupAudit` | `patient_lookup_audits` | Auditoria de consultas por CPF. |
| `LegalActRecord` | `legal_act_records` | Atos legais versionados. |

## 11.3 Enumerações

O schema declara:

- `EmergencyStatus`: `TRIGGERED`, `NOTIFIED`, `ACCEPTED`, `RESOLVED`;
- `StaffRole`: `MEDICO_SOCORRISTA`, `ENFERMEIRO_SOCORRISTA`, `TECNICO_ENFERMAGEM`, `OPERADOR_TACTICAL`, `ADMINISTRATIVO`;
- `LegalActType`: `TERMS_OF_USE`, `PRIVACY_NOTICE`, `EXPLICIT_CONSENT`;
- `LegalBasis`: `CONSENT`, `CONTRACT`, `LEGAL_OBLIGATION`, `VITAL_INTEREST`, `PUBLIC_TASK`, `LEGITIMATE_INTEREST`, `EXERCISE_OF_RIGHTS`.

Os campos `LegalActRecord.actType` e `LegalActRecord.legalBasis` permanecem tipados como `String` no modelo atual. Os enums correspondentes também estão declarados no schema, mas a tipagem desses dois atributos precisa ser interpretada conforme sua declaração efetiva.

## 11.4 Identificadores e tipos físicos

Os modelos utilizam identificadores `String` no Prisma com `@db.Uuid`, persistidos como UUID no PostgreSQL. Campos temporais são representados por `DateTime` ou `Date` conforme a necessidade. Dados numéricos de medidas e coordenadas utilizam `Decimal` com precisão definida. Estruturas de snapshot e payload utilizam `Json` com mapeamento `JsonB`.

O catálogo de medicamentos possui arrays de strings para substâncias, apresentações e tarjas. Campos textuais de tamanho limitado utilizam `VarChar`; conteúdos extensos utilizam `Text`.

## 11.5 Relacionamentos persistidos

Os principais relacionamentos declarados são:

- `User` para `ChronicCondition`: um paciente pode possuir várias condições; cada condição pertence a um paciente.
- `DiseaseDictionary` para `ChronicCondition`: um item do catálogo pode ser referenciado por várias condições.
- `User` para `Medication`: um paciente pode registrar vários medicamentos.
- `MedicationsDictionary` para `Medication`: um item de catálogo pode ser relacionado a vários medicamentos de paciente; a referência no medicamento é opcional.
- `Medication` para `MedicationHistory`: um medicamento pode possuir várias alterações históricas.
- `User` para `MedicationHistory`: o histórico também identifica o titular.
- `User` para `EmergencyContact`, `Allergy` e `ForbiddenMedication`: registros individuais pertencem ao paciente.
- `MedicationsDictionary` para `ForbiddenMedication`: cada restrição identifica um item de catálogo.
- `User` para `EmergencyEvent`: um paciente pode acionar várias ocorrências.
- `Staff` para `EmergencyEvent`: um profissional pode assumir várias ocorrências; a atribuição é opcional antes do aceite.
- `User` para `RefreshToken` e `PasswordResetToken`: uma conta pode possuir vários registros de sessão e recuperação.

## 11.6 Integridade referencial e exclusão

Os campos de relação indicam se o vínculo é obrigatório ou opcional. O vínculo opcional de `Medication` com `MedicationsDictionary` utiliza `onDelete: SetNull`, preservando o registro do paciente quando a referência de catálogo é removida. A atribuição de `EmergencyEvent` ao profissional também é opcional e utiliza `SetNull`.

Relações de registros clínicos com o usuário utilizam ações `Cascade` conforme o schema, de modo que a exclusão do registro pai propaga-se aos registros dependentes definidos. Essas ações devem ser consideradas em conjunto com os procedimentos de retenção e governança de dados.

## 11.7 Relações mantidas pela aplicação

Alguns identificadores representam referências sem relação Prisma/FK declarada:

- `IdempotencyRecord.userId`;
- referência da ocorrência dentro do JSONB de `OutboxEvent.payload`;
- `PatientLookupAudit.staffId`;
- `LegalActRecord.actorId` e `holderId`;
- relação de `DiseaseGroup` com códigos de `DiseaseDictionary`.

A consistência dessas referências é coordenada pela lógica da aplicação. Elas não produzem automaticamente uma constraint referencial no PostgreSQL.

## 11.8 Constraints e índices

Entre as constraints de unicidade estão:

- `User.googleId`;
- índices cegos de e-mail e CPF de `User` e `Staff`;
- `DiseaseDictionary.code`;
- `DiseaseGroup.start_code` e `end_code`;
- combinação `(userId, scope, key)` em `IdempotencyRecord`;
- combinação `(userId, medicationsDictionaryId)` em `ForbiddenMedication`.

Índices adicionais apoiam consultas por usuário, estado ativo, histórico cronológico, ocorrências recentes, estado de outbox, tokens e auditoria. Índices e constraints são declarados no schema e materializados por migrações.

## 11.9 Persistência de dados protegidos

`User` e `Staff` armazenam atributos identificadores em campos cifrados, como e-mail, CPF, telefone ou nome, e mantêm índices cegos para pesquisa por igualdade. Outros modelos clínicos contêm campos específicos de proteção, incluindo atributos `*_enc`.

O `EmergencyEvent` armazena o snapshot clínico em JSONB e possui o campo `patientSnapshotEnc` para a representação cifrada. A persistência de conteúdo estruturado e cifrado é coordenada pelo repositório de emergência e pelo serviço de criptografia.

## 11.10 Migrações e geração do cliente

As migrações encontram-se em `apps/api/prisma/migrations/`. Elas incluem a criação dos catálogos, expansão do perfil clínico, restrições medicamentosas, entidade de equipe, remoção da estrutura de schedules, emergência/idempotência/outbox, auditoria por CPF, criptografia de PII e dados clínicos, atos legais e vínculo com o catálogo de medicamentos.

O generator utiliza `prisma-client` com saída em `../generated/prisma`. A configuração do Prisma CLI encontra-se em `apps/api/prisma.config.ts`, que define o schema, a pasta de migrações e a URL de banco utilizada pelo CLI. O runtime utiliza o adapter PostgreSQL no serviço de infraestrutura.

Comandos de validação:

```bash
pnpm --filter @vitare/api exec prisma validate
pnpm --filter @vitare/api exec prisma generate
pnpm --filter @vitare/api exec prisma migrate status
```

A aplicação de migrações em ambiente público é executada pelo serviço `migrate`, que utiliza `prisma migrate deploy` antes de iniciar a API.
