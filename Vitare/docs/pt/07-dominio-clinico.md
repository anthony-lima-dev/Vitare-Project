# 7. Domínio clínico e catálogos

[🇧🇷 Português (Brasil)](07-dominio-clinico.md) | [🇺🇸 English](../en/07-clinical-domain.md) | [Índice](00-indice.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 7.1 Organização do prontuário

O domínio clínico separa os registros individuais do paciente dos catálogos de referência. `User` representa a conta e o perfil; condições, medicamentos, alergias, restrições e contatos são registros associados ao usuário. Os catálogos descrevem conceitos reutilizáveis que podem ser selecionados durante o preenchimento dos dados clínicos.

## 7.2 Condições crônicas

`ChronicCondition` associa o paciente a um item de `DiseaseDictionary`. O registro contém identificador, referência do usuário, identificador do catálogo, notas, data de diagnóstico, indicador de atividade e data de criação.

A relação com o usuário utiliza FK obrigatória. A relação com o catálogo de doenças também é obrigatória. Um paciente pode manter várias condições, e um item de catálogo pode ser referenciado por diversos registros individuais.

## 7.3 Catálogo de doenças

`DiseaseDictionary` armazena identificador, código e descrição da doença. O código é único. Os registros são importados de arquivos JSON presentes em `apps/api/prisma/data/`, incluindo a base `CID.json`.

`DiseaseGroup` armazena agrupamentos por intervalo, com código inicial, código final e nome do grupo. O agrupamento utiliza os valores de faixa e não depende de uma relação por FK individual com cada doença.

## 7.4 Medicamentos

`Medication` representa um medicamento associado ao paciente. Os principais atributos são nome, dose, frequência, data de início, data final opcional, notas e indicador de atividade.

A referência a `MedicationsDictionary` é opcional para um medicamento em uso. Isso permite registrar um medicamento informado pelo paciente mesmo quando o item não estiver identificado no catálogo. A frequência é armazenada em `frequency`; a versão atual não utiliza uma entidade separada de schedules.

O período de uso é representado por `startDate` e `endDate`. O indicador `isActive` permite distinguir medicamentos atualmente utilizados de registros históricos.

## 7.5 Histórico de alterações

`MedicationHistory` relaciona-se ao medicamento e ao usuário. Cada registro armazena a data da alteração, o campo alterado e os valores anterior e novo. O histórico permite acompanhar mudanças em dose, frequência, período de utilização ou outros atributos relevantes do medicamento.

## 7.6 Catálogo de medicamentos

`MedicationsDictionary` organiza os itens de referência por nome, laboratório, substâncias, apresentações e tarjas. Os atributos de listas são representados como arrays de strings no PostgreSQL.

Os dados de origem estão em `apps/api/prisma/data/medicamentos.json`. O seed importa registros em lotes para o banco, permitindo que a API ofereça pesquisa pelo endpoint `/api/v1/medications-dictionary`.

## 7.7 Alergias

`Allergy` é vinculada a `User` e registra nome ou substância, gravidade, observações e data de criação. Um paciente pode manter diversas alergias. As informações fornecidas devem ser exibidas de forma clara à equipe quando forem recuperadas no contexto autorizado.

## 7.8 Medicamentos proibidos ou restritos

`ForbiddenMedication` associa obrigatoriamente um paciente a um item de `MedicationsDictionary`. O campo `reason` armazena a justificativa informada. A constraint composta por usuário e item de catálogo impede duplicar a mesma restrição para o mesmo paciente.

Essa entidade mantém uma restrição declarada no perfil do paciente; ela não representa, por si só, uma validação farmacológica ou mecanismo de prescrição.

## 7.9 Contatos de emergência

`EmergencyContact` armazena nome, telefone, relacionamento com o paciente, indicador de contato principal e data de criação. Um usuário pode manter vários contatos e indicar um deles como principal.

O cadastro de contatos disponibiliza as informações para consulta durante o fluxo de emergência. O armazenamento do contato não significa que o sistema realiza automaticamente chamada telefônica ou envio de SMS.

## 7.10 Relacionamento entre dados individuais e catálogos

| Registro individual | Catálogo relacionado | Obrigatoriedade do vínculo |
|---|---|---|
| `ChronicCondition` | `DiseaseDictionary` | Obrigatório. |
| `Medication` | `MedicationsDictionary` | Opcional. |
| `ForbiddenMedication` | `MedicationsDictionary` | Obrigatório. |

O catálogo é mantido uma única vez e pode ser referenciado por diferentes pacientes. Os registros individuais conservam informações específicas do paciente, como datas, observações, dose, frequência, gravidade e motivo.

## 7.11 Importação e atualização dos dados de referência

O script `apps/api/prisma/seed.ts` carrega os arquivos JSON para os modelos correspondentes. O processo utiliza operações em lote e `skipDuplicates` para evitar duplicação de registros com chaves já existentes.

A atualização de um catálogo deve considerar a fonte original, a versão do conjunto, a codificação, a padronização dos códigos e nomes e a compatibilidade com os dados já armazenados. Os arquivos de origem devem ser tratados como dados de referência, mantendo sua procedência e período de atualização.
