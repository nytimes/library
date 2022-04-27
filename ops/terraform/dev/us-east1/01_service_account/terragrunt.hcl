# Terraform module call to configure datastore for LibraryViewDoc Entity kind
terraform {
   source = "${get_parent_terragrunt_dir()}//modules//service_account"
}

include {
   path = find_in_parent_folders()
}

locals {
  environment = "dev"
  resource_prefix = "nytimes-library"
  project_id = read_terragrunt_config(find_in_parent_folders("account.hcl"))
}

inputs = {
  project_id         = local.project_id.locals.project_id
  service_account_id = "${local.resource_prefix}-${local.environment}"
  service_account_display_name = "${local.resource_prefix}-${local.environment}"
  use_secretsmanager = true
}
