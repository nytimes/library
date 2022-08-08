# Terraform module to create the IAM service account used by the content library app
terraform {
  source = "${get_parent_terragrunt_dir()}//modules//service_account"
}

include {
  path = find_in_parent_folders()
}

# Set a dependency for the GCP APIs being enabled, which will prevent this module from running too early
dependency "library_service_api" {
  config_path  = "../00_library_service_api"
  skip_outputs = true
}


locals {
  environment     = "dev"
  resource_prefix = "nytimes-library"
  project_id      = read_terragrunt_config(find_in_parent_folders("account.hcl"))
}

inputs = {
  project_id                   = local.project_id.locals.project_id
  service_account_id           = "${local.resource_prefix}-${local.environment}"
  service_account_display_name = "${local.resource_prefix}-${local.environment}"
  use_secretsmanager           = true
  create_gha                   = true
}
