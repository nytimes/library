data "google_project" "project" {
}

resource "google_app_engine_application" "app" {
  project              = data.google_project.project.project_id
  database_type        = var.database_type
  location_id          = "us-central"
}


