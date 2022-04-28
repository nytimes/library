# Terraform module call to configure datastore for LibraryViewDoc Entity kind
terraform {
   source = "${get_parent_terragrunt_dir()}//modules//library_oauth_client"
}

include {
   path = find_in_parent_folders()
}

# Set a dependency for the GCP APIs being enabled, which will prevent this module from running too early
dependency "library_service_api" {
  config_path = "../00_library_service_api"
  skip_outputs = true
}


locals {
  environment = "dev"
  resource_prefix = "nytimes-library"
  project_id = read_terragrunt_config(find_in_parent_folders("account.hcl"))
}

inputs = {
  project_id         = local.project_id.locals.project_id
  # When calling this module ensure you are the owner of the provided google group!
  support_email      = "infrastructure.admin@adhocteam.us"
  application_title  = "Ad Hoc Content Library Development"
  oauth_client_name  = "NYTimes Library OAuth Client"
}
