#!/bin/sh
set -eu
server=${1:-}
port=${2:-1080}
if [ "$#" -gt 2 ] || [ -z "$server" ]; then
  printf 'Usage: sh scripts/connect.sh <ssh-config-alias> [local-port]\n' >&2
  exit 2
fi
case "$server" in
  -*|*[!a-zA-Z0-9._-]*) printf 'Use a hostname or an alias from your local SSH config.\n' >&2; exit 2 ;;
esac
case "$port" in
  ''|*[!0-9]*|????????*) printf 'Use a port from 1 to 65535.\n' >&2; exit 2 ;;
esac
if [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
  printf 'Use a port from 1 to 65535.\n' >&2
  exit 2
fi
printf 'Starting the local SOCKS5 connection at 127.0.0.1:%s. Press Ctrl+C to stop.\n' "$port"
exec ssh -N -T -D "127.0.0.1:$port" \
  -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
  -- "$server"
