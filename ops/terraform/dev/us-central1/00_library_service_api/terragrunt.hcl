# Terraform module call to enable required GCP service APIs which are used by other TF modules
terraform {
  source = "${get_parent_terragrunt_dir()}//modules//library_service_api"
}

include {
  path = find_in_parent_folders()
}

inputs = {
  additional_services_to_enable = [
    "secretmanager.googleapis.com"
  ]
}
