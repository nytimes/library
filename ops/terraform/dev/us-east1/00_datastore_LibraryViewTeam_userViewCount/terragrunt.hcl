# Terraform module call to configure datastore for LibraryViewDoc Entity kind
terraform {
   source = "${get_parent_terragrunt_dir()}//modules//datastore"
}

include {
   path = find_in_parent_folders()
}

locals {
  environment = "dev"
  resource_prefix = "nytimes-library"
}

inputs = {
  entity_kind = "LibraryViewTeam"
  properties = tolist([
    {
      name = "userId"
      direction = "ASCENDING"
    },
    {
      name = "viewCount"
      direction = "DESCENDING"
    }
  ])
  
}
