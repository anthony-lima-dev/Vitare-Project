# Publicação por Cloudflare Tunnel

O túnel é uma camada externa à aplicação. O container principal continua conhecendo apenas Nginx, API e PostgreSQL.

Fluxo recomendado:

```text
Internet
   ↓
Cloudflare
   ↓
Cloudflare Tunnel
   ↓
Host Windows/Linux
   ↓
Nginx HTTPS
   ├── /
   ├── /monitoramento/
   └── /api/
```

No domínio público, mantenha a mesma origem para as três áreas. O frontend continua usando `/api/v1`, portanto não precisa conhecer o endereço interno do NestJS.

Configure separadamente `APP_URL`, `CORS_ORIGIN` e `GOOGLE_CALLBACK_URL` para o domínio público e cadastre o callback exato no provedor Google.

Não coloque token, certificado, credencial de tunnel ou segredo de API neste repositório.
