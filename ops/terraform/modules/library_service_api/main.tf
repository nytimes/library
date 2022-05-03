locals {
  service_list = concat(
    [
      "datastore.googleapis.com",
      "drive.googleapis.com",
      "iap.googleapis.com"
    ],
    var.additional_services_to_enable
  )
}

resource "google_project_service" "main" {
  for_each                   = toset(local.service_list)
  service                    = each.value
  disable_dependent_services = true
}
