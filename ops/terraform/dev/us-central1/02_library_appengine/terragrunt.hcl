# Builds the app engine application that the library application deploys to
terraform {
  source = "${get_parent_terragrunt_dir()}//modules//appengine"
}

include {
  path = find_in_parent_folders()
}

dependency "service_account" {
  config_path  = "../01_service_account"
  skip_outputs = true
}

locals {
  project_id = read_terragrunt_config(find_in_parent_folders("account.hcl"))
  region     = read_terragrunt_config(find_in_parent_folders("region.hcl"))
}

inputs = {
  project_id = local.project_id.locals.project_id
  region     = local.region.locals.region
}
