#!/bin/sh
set -eu

export DATABASE_URL="${DATABASE_URL:-file:/data/macops.sqlite}"
mkdir -p /data

node scripts/bootstrap-db.mjs
node server.js
