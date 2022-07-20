locals {
  # App engine recognizes us-central1 as "us-central" and "europe-west1" as "europe-west", but will take any other region ID normally
  # We don't convert europe-west though because we do not want to deploy any resources to outside of the US
  location_id = var.region == "us-central1" ? "us-central" : var.region

}

resource "google_app_engine_application" "app" {
  project       = var.project_id
  database_type = var.database_type
  location_id   = local.location_id
}

data "google_app_engine_default_service_account" "default" {
}

# Grant the app engine default account the ability to access secret manager


resource "google_project_iam_binding" "default" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  members = [
    "serviceAccount:${data.google_app_engine_default_service_account.default.email}"
  ]
}
