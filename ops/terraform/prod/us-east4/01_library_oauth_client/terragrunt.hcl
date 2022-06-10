# Terraform module call to configure the OAuth client for the nytimes library app
terraform {
  source = "${get_parent_terragrunt_dir()}//modules//library_oauth_client"
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
}

inputs = {
  project_id = local.project_id.locals.project_id
  # When calling this module ensure you are the owner of the provided google group!
  support_email                  = "content-library-managers.group@adhocteam.us"
  application_title              = "Ad Hoc Content Library"
  oauth_client_name              = "NYTimes Library OAuth Client"
  use_secretsmanager             = true
  secretsmanager_resource_prefix = "${local.resource_prefix}-${local.environment}"
}
