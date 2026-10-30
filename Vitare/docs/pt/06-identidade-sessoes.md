# 6. Identidade, autenticação e sessões

[🇧🇷 Português (Brasil)](06-identidade-sessoes.md) | [🇺🇸 English](../en/06-identity-sessions.md) | [Índice](00-indice.md)

<p align="center">
  <img src="../../apps/web/public/vitare-logo.png" alt="Vitare Logo" width="200"/>
</p>

## 6.1 Separação de identidades

O domínio mantém dois tipos de identidade: `User`, utilizado pelos pacientes, e `Staff`, utilizado pelos profissionais. As entidades são persistidas separadamente e possuem fluxos de autenticação distintos, estratégias JWT e regras de autorização próprias.

Os tokens de paciente e de equipe não são intercambiáveis. O token da equipe contém a informação de tipo `staff`; a estratégia e os guards específicos validam esse contexto antes de liberar endpoints internos do portal.

## 6.2 Seleção do método de autenticação

O endpoint `POST /api/v1/auth/login/check-realm` recebe o e-mail e normaliza o valor com trim e conversão para minúsculas. Endereços `gmail.com` e `googlemail.com` são direcionados à autenticação Google. Para outros domínios, a API consulta o vínculo existente e retorna o método local quando a conta não estiver associada ao Google.

O objetivo dessa etapa é determinar qual experiência de autenticação a interface deve iniciar. A verificação de domínio não substitui a validação de identidade realizada pelo provedor ou pela senha.

## 6.3 Cadastro local

O cadastro local recebe nome, e-mail, senha e os registros de aceite dos documentos legais requeridos. O serviço `AuthService.register` valida os documentos vigentes antes de criar a conta. A persistência do usuário e dos atos legais é coordenada pelo repositório em uma transação.

A senha é transformada em hash bcrypt usando o custo configurado por `BCRYPT_SALT_ROUNDS` (12 no exemplo). O valor original não deve ser persistido. Depois da criação, a API emite um access token e um refresh token.

## 6.4 Login local

O login busca a conta pelo e-mail e verifica a senha informada contra o hash bcrypt persistido. Após a validação, o backend emite a dupla de tokens. A emissão do refresh token também grava no PostgreSQL o hash SHA-256 do token, a identidade associada, a data de expiração e o instante de criação.

## 6.5 Google OAuth

O fluxo federado ocorre em etapas:

1. A interface solicita o início do OAuth.
2. A API redireciona o navegador ao Google.
3. O provedor autentica a pessoa e retorna ao callback configurado.
4. O backend valida o perfil recebido e localiza ou cria a identidade `User`.
5. A API emite a dupla de tokens e cria um código temporário de troca.
6. O navegador recebe o código temporário e chama `POST /api/v1/auth/google/exchange`.
7. O serviço consome o código uma única vez e devolve os tokens ao frontend.
8. O frontend obtém o perfil atualizado e encaminha o usuário à área autenticada ou ao complemento do cadastro.

`GoogleAuthSessionService` armazena o hash do código temporário, associa-o ao par de tokens e aplica TTL de 60 segundos. O código original é apresentado ao cliente, mas apenas seu hash é usado como chave interna. Ao consumir o código, o registro em memória é removido.

## 6.6 Sessão e tokens

O access token é JWT, assinado com `JWT_ACCESS_SECRET`. O prazo padrão de referência é 15 minutos. O refresh token é opaco, gerado aleatoriamente e armazenado no banco apenas por hash. O prazo de referência do refresh token é 7 dias. A equipe utiliza `STAFF_JWT_SECRET` e `STAFF_JWT_EXPIRES_IN`, com 2 horas no exemplo de configuração.

A aplicação cliente mantém os tokens de acordo com sua implementação de sessão. As chamadas HTTP autenticadas adicionam o access token no cabeçalho Authorization. Quando a API indica expiração da sessão, o cliente pode solicitar renovação pelo endpoint dedicado.

## 6.7 Renovação e rotação do refresh token

`POST /api/v1/auth/refresh` recebe o refresh token atual. O backend calcula seu hash e solicita ao repositório uma rotação atômica. A operação consome o token anterior e persiste o hash de um sucessor, com nova expiração.

Apenas uma solicitação concorrente deve conseguir consumir o mesmo token. Quando um token já utilizado é apresentado novamente, o resultado é tratado como reutilização de credencial e a política do backend encerra a família de sessões. O cliente deve substituir o refresh token pelo sucessor retornado e utilizar o novo par nas próximas chamadas.

## 6.8 Logout

`POST /api/v1/auth/logout` revoga o refresh token apresentado. A limpeza local remove a sessão do navegador e os dados offline relacionados conforme a política da aplicação. A revogação do refresh token impede novas renovações com aquele valor; o access JWT já emitido conserva a validade criptográfica até expirar, salvo validação adicional de revogação no servidor.

## 6.9 Recuperação e redefinição de senha

O endpoint `POST /api/v1/auth/forgot-password` recebe o e-mail e retorna resposta genérica, independentemente de a conta existir, evitando revelar diretamente a presença de um cadastro.

Para uma conta encontrada, o backend gera um token opaco, armazena somente seu hash SHA-256 e define validade de uma hora. O serviço Resend encaminha uma mensagem com o link para a rota `/auth/reset-password`.

A redefinição utiliza `POST /api/v1/auth/reset-password`. O backend procura o hash do token, verifica validade e uso anterior, calcula o novo hash bcrypt e consome o token. A troca de senha e a revogação dos refresh tokens ativos são realizadas na mesma transação do repositório.

## 6.10 Provisionamento da equipe

A primeira conta da equipe é criada com a chave de bootstrap `STAFF_BOOTSTRAP_KEY`, apresentada pelo header `X-Bootstrap-Key`. `GET /api/v1/staff/auth/setup-status` informa se ainda é necessária a criação inicial.

O processo de bootstrap protege a reivindicação da primeira conta contra solicitações concorrentes. Depois dessa etapa, o registro de novos profissionais exige identidade administrativa autenticada. Cada profissional recebe papel definido a partir do enum `StaffRole`.

## 6.11 Atos legais do onboarding

O módulo `legal` mantém registros versionados dos documentos exigidos, como Termos de Uso e Aviso de Privacidade. Cada registro inclui tipo, versão do documento, hash do conteúdo, finalidade, base legal, origem, ator, titular, hash de IP quando aplicável e instante de registro.

A versão e o hash do documento permitem associar a ação do usuário à versão específica exibida no momento do onboarding. Os registros são append-only no fluxo de negócio, preservando o histórico de aceites.
