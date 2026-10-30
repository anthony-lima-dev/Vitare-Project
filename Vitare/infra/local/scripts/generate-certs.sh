#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_DIR="$ROOT_DIR/certs"
LAN_IP="${1:-}"

if ! command -v mkcert >/dev/null 2>&1; then
  echo "Erro: mkcert não está instalado. Instale-o no host antes de continuar." >&2
  exit 1
fi

if [[ -z "$LAN_IP" ]]; then
  LAN_IP="$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if ($i=="src") {print $(i+1); exit}}')"
fi

if [[ -z "$LAN_IP" ]]; then
  echo "Não foi possível detectar o IP LAN. Execute: $0 192.168.1.50" >&2
  exit 1
fi

mkdir -p "$CERT_DIR"
mkcert -install
mkcert \
  -cert-file "$CERT_DIR/vitare.crt" \
  -key-file "$CERT_DIR/vitare.key" \
  localhost 127.0.0.1 ::1 "$LAN_IP"

echo
echo "Certificado criado para: localhost, 127.0.0.1 e $LAN_IP"
echo "Para testar no celular, instale a CA raiz do mkcert no aparelho."
echo "A localização da CA pode ser obtida com: mkcert -CAROOT"
echo "Nunca versionar vitare.crt/vitare.key/rootCA.pem."
