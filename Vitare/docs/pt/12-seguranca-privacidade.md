# 12. Segurança e privacidade

[🇧🇷 Português (Brasil)](12-seguranca-privacidade.md) | [🇺🇸 English](../en/12-security-privacy.md) | [Índice](00-indice.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 12.1 Camadas de proteção

A segurança do Vitare é distribuída entre navegador, API, persistência e infraestrutura. A aplicação utiliza autenticação por token, autorização por identidade e papel, validação de DTOs, controle de taxa de requisições, proteção de campos sensíveis, redes Docker separadas e registros de auditoria.

A aplicação do paciente e o portal da equipe possuem contextos de sessão próprios. A API valida esses contextos em cada operação protegida; a autorização não depende apenas do roteamento ou da apresentação de componentes no frontend.

## 12.2 Senhas

Senhas locais são processadas com bcrypt por meio dos utilitários de hash do backend. O valor armazenado em `User.passwordHash` ou `Staff.passwordHash` é o hash da senha. O custo é configurado por `BCRYPT_SALT_ROUNDS`, com valor de referência 12.

A política de senha utiliza parâmetros como `PASSWORD_MIN_LENGTH` e `PASSWORD_MIN_RULES`. A validação deve ocorrer no backend, mesmo quando o frontend também apresenta regras de preenchimento.

## 12.3 Tokens

O access token é JWT. Os segredos de assinatura do paciente e da equipe são separados (`JWT_ACCESS_SECRET` e `STAFF_JWT_SECRET`). Os tempos de validade são configuráveis.

Refresh tokens são valores opacos gerados aleatoriamente. O banco persiste o hash SHA-256, em vez do token original. Tokens de redefinição de senha seguem o mesmo princípio: token opaco enviado por e-mail e hash persistido no PostgreSQL.

As verificações de tipo de identidade impedem que um token de paciente seja utilizado em endpoints da equipe e vice-versa. Tokens e credenciais não devem aparecer em logs, analytics, telemetria, parâmetros de URL ou arquivos versionados.

## 12.4 Criptografia de campos

`SensitiveFieldEncryptionService` implementa AES-256-GCM. A configuração utiliza chave de 32 bytes codificada em Base64. Cada operação gera IV aleatório de 12 bytes e utiliza tag de autenticação de 16 bytes.

O envelope criptográfico contém:

- versão do formato;
- identificador da chave (`keyId`);
- IV;
- ciphertext;
- tag de autenticação.

A implementação utiliza AAD `vitare-pii-v1` e valida a versão e o identificador da chave durante a descriptografia. Dados alterados ou ciphertext incompatível com a chave não devem ser tratados como conteúdo válido.

## 12.5 Índices cegos

Para campos que precisam ser localizados por igualdade, o serviço utiliza HMAC-SHA-256 com uma chave separada da chave AES. As funções de canonicalização normalizam valores antes de gerar o índice:

- e-mail: trim e lowercase;
- CPF: somente dígitos;
- telefone: somente dígitos;
- nome completo e endereço: trim e normalização de espaços;
- data de nascimento: representação ISO de data.

O índice cego permite localizar o registro sem utilizar o texto original como chave de consulta. Como é determinístico para uma mesma entrada e chave, deve ser tratado como dado sensível e protegido.

## 12.6 Chaves criptográficas

As variáveis principais são `ENCRYPTION_KEY`, `BLINDED_INDEX_KEY` e `ENCRYPTION_KEY_ID`. As duas chaves devem ser distintas e possuir exatamente 32 bytes após decodificação Base64.

A chave nunca deve ser incluída no frontend, em argumentos de build, em imagem Docker, repositório, documentação ou backup não protegido. O processo de rotação deve preservar acesso aos dados já criptografados, gerar novos ciphertexts e atualizar índices cegos de acordo com a versão de chave adotada.

## 12.7 Autorização por papel e propriedade

As decisões de acesso são realizadas no backend. Endpoints do paciente verificam a identidade `User` e o escopo do próprio registro. Endpoints da equipe validam a identidade `Staff` e o papel aplicável.

A consulta por CPF utiliza uma lista explícita de papéis autorizados: `MEDICO_SOCORRISTA`, `ENFERMEIRO_SOCORRISTA`, `TECNICO_ENFERMAGEM` e `ADMINISTRATIVO`. O operador tático permanece no fluxo de monitoramento operacional e não acessa o prontuário completo por essa operação.

## 12.8 Auditoria de consulta e atos legais

`PatientLookupAudit` registra identificador do profissional, papel, identificador protegido do CPF consultado, resultado e data/hora. Os resultados do fluxo incluem `FOUND`, `NOT_FOUND` e `DENIED`.

`LegalActRecord` registra a ação relacionada a documentos legais, incluindo tipo, versão, hash de conteúdo, finalidade, base legal, ator, titular, origem e instante. Auditoria de consulta e registro de atos legais possuem objetivos diferentes e são armazenados em modelos distintos.

## 12.9 Minimização e eventos operacionais

Os eventos Socket.IO devem conter somente os dados necessários ao acompanhamento da ocorrência. O snapshot clínico completo é recuperado por endpoint REST protegido. Logs operacionais devem privilegiar IDs de correlação e estados, evitando registrar tokens, senhas, CPF integral, telefones, endereços ou conteúdo clínico.

O cache do Service Worker exclui as rotas de API e autenticação. O cache IndexedDB do paciente utiliza escopo por usuário e validade temporal. A política de retenção local deve acompanhar as regras de sessão, troca de usuário e encerramento de conta.

## 12.10 LGPD e governança

Informações de saúde são dados pessoais sensíveis nos termos da LGPD. O tratamento exige definição de finalidade, base legal, necessidade, minimização, retenção, direitos dos titulares, compartilhamentos, operadores, controle de acesso e processo de resposta a incidentes.

Os registros de atos legais ajudam a manter a versão documental associada ao onboarding, mas não substituem a definição jurídica do controlador sobre as bases legais aplicáveis a cada finalidade. A apresentação de um termo na interface não significa que toda operação seja necessariamente fundamentada em consentimento.

A documentação técnica não constitui certificação de conformidade LGPD ou HIPAA. A governança deve ser estabelecida pelos responsáveis legais e institucionais do tratamento.

## 12.11 Proteção de arquivos e ambientes

Arquivos reais `.env`, `.env.local` e `.env.public`, tokens de Tunnel, chaves privadas, certificados locais e dumps de banco não devem ser publicados. O repositório deve manter apenas exemplos com placeholders. A revisão para GitHub deve incluir histórico, branches, tags, artefatos de integração contínua e backups distribuídos.

As credenciais devem ser exclusivas por ambiente. O acesso a segredos, logs, bancos e backups deve ser restrito às pessoas e serviços que necessitam deles.
