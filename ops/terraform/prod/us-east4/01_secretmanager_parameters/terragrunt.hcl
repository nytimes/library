# Terraform module to create the IAM service account used by the content library app
terraform {
  source = "${get_parent_terragrunt_dir()}//modules//secret_manager"
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
  environment     = "prod"
  resource_prefix = "nytimes-library"
  project_id      = read_terragrunt_config(find_in_parent_folders("account.hcl"))
  common_env_vars = tolist(jsondecode(file(find_in_parent_folders("common_vars.json"))))
  environment_env_vars = tolist([
    {
      name  = "GCP_PROJECT_ID"
      value = local.project_id.locals.project_id
    },
    {
      name  = "GOOGLE_CLIENT_ID"
      value = "1022301087651-7nc2ltpcc34fku82bm3h29n4v963ip8f.apps.googleusercontent.com"
    },
    {
      name  = "REDIRECT_URL"
      value = "https://content-library.adhoc.pizza/auth/redirect"
    },
    {
      name  = "NODE_ENV"
      value = "production"
    }
  ])
  full_environment_vars     = concat(local.common_env_vars, local.environment_env_vars)
  common_sensitive_env_vars = tolist(jsondecode(file(find_in_parent_folders("common_sensitive_vars.json"))))
  sensitive_env_vars        = tolist([])
  full_sensitive_env_vars   = concat(local.common_sensitive_env_vars, local.sensitive_env_vars)
}

inputs = {
  project_id                 = local.project_id.locals.project_id
  plaintext_secret_resources = local.full_environment_vars
  sensitive_secret_resources = local.full_sensitive_env_vars
}
