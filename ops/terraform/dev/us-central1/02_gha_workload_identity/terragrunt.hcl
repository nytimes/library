# Create GHA workload identity pool and provider for hooking GHA into our GCP environment
# Depends on the service account module with create_gha set to true
terraform {
  source = "${get_parent_terragrunt_dir()}//modules//workload_identity"
}

include {
  path = find_in_parent_folders()
}

# Set a dependency for the GCP APIs being enabled, which will prevent this module from running too early
dependency "library_service_api" {
  config_path  = "../00_library_service_api"
  skip_outputs = true
}

dependency "service_account" {
  config_path  = "../01_service_account"
  skip_outputs = false
}

locals {
  environment        = "dev"
  resource_prefix    = "nytimes-library"
  project_id         = read_terragrunt_config(find_in_parent_folders("account.hcl"))
  repository_name    = "adhocteam/nytimes-library"
  identity_pool_name = "${local.resource_prefix}-${local.environment}-gha"
}

inputs = {
  identity_pool_id           = local.identity_pool_name
  identity_pool_display_name = local.identity_pool_name
  identity_pool_description  = "Identity pool used for Github actions authentication"

  identity_provider_attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.actor"            = "assertion.actor"
    "attribute.repository"       = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
  }

  oidc_issuer_uri                    = "https://token.actions.githubusercontent.com"
  service_account_bind_email         = dependency.service_account.outputs.gha_service_account_id
  service_account_bind_member_string = "principalSet://iam.googleapis.com/%%%%/attribute.repository/${local.repository_name}"
}
