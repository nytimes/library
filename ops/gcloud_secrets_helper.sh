#!/usr/bin/env bash

# Helper to make it easier to grab secrets from GCP secret manager

# Get the latest enabled secret version if it wasn't already provided

secret_name="$1"
version="$2"

if [ -z "$version" ]; then
  # shellcheck disable=SC2086
  version="$(gcloud secrets versions list $secret_name --filter=enabled --sort-by='`' --limit=1 --format=json | jq -r '.[].name' | sed 's/.*\///g')"
fi

# Return the secret (note this does not know if the secret is base64 encoded. If it is encoded, you must pipe this scripts output to a base64 -d command)

gcloud secrets versions access "$version" --secret="$secret_name"
