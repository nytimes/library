locals {
  # Automatically load account-level variables
  account_vars = read_terragrunt_config(find_in_parent_folders("account.hcl"))

  # Automatically load region-level variables
  region_vars = read_terragrunt_config(find_in_parent_folders("region.hcl"))

  # Extract the variables we need for easy access
  account_name = local.account_vars.locals.account_name
  project_id   = local.account_vars.locals.project_id
  region       = local.region_vars.locals.region
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "google" {
   project = "${local.project_id}"
   region  = "${local.region}"
}
EOF
}

remote_state {
  backend = "gcs"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }

  config = {
    project  = "${local.project_id}"
    location = "us"
    bucket   = "${local.account_name}-tfstate"
    prefix   = "${path_relative_to_include()}/terraform.tfstate"
  }
}

inputs = merge(
  local.account_vars.locals,
  local.region_vars.locals
)
