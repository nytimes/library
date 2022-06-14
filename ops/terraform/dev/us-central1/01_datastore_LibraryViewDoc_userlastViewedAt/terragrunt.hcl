# Terraform module call to configure datastore for LibraryViewDoc Entity kind
terraform {
  source = "${get_parent_terragrunt_dir()}//modules//datastore"
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
}

inputs = {
  entity_kind = "LibraryViewDoc"
  properties = tolist([
    {
      name      = "userId"
      direction = "ASCENDING"
    },
    {
      name      = "lastViewedAt"
      direction = "DESCENDING"
    }
  ])

}
