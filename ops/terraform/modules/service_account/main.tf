
data "google_app_engine_default_service_account" "default" {
}

resource "google_service_account" "main" {
  account_id   = var.service_account_id
  display_name = var.service_account_display_name
  description  = var.service_account_description
}


resource "google_service_account" "gha" {
  count        = var.create_gha ? 1 : 0
  account_id   = "${var.service_account_id}-gha"
  display_name = "${var.service_account_display_name}-github-actions"
  description  = "For use with Github actions"
}


# Grant the GHA service account needed permissions to deploy to GAE
# This doc was referenced when determmining what roles are needed
# https://cloud.google.com/appengine/docs/legacy/standard/python/roles

resource "google_project_iam_member" "gha_appengine" {
  count   = var.create_gha ? 1 : 0
  project = var.project_id
  role    = "roles/appengine.deployer"
  member  = "serviceAccount:${google_service_account.gha[0].email}"
}

resource "google_project_iam_member" "gha_appengine_service" {
  count   = var.create_gha ? 1 : 0
  project = var.project_id
  role    = "roles/appengine.serviceAdmin"
  member  = "serviceAccount:${google_service_account.gha[0].email}"
}

# Grants GHA the ability to admin GCS buckets
resource "google_project_iam_member" "gha_gcs" {
  count   = var.create_gha ? 1 : 0
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.gha[0].email}"
}

resource "google_project_iam_member" "gha_cloudbuild" {
  count   = var.create_gha ? 1 : 0
  project = var.project_id
  role    = "roles/cloudbuild.builds.editor"
  member  = "serviceAccount:${google_service_account.gha[0].email}"
}

# Grants the GHA service account access to the app engine service account
resource "google_service_account_iam_member" "gha_appengine" {
  count              = var.create_gha ? 1 : 0
  service_account_id = data.google_app_engine_default_service_account.default.id
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.gha[0].email}"
}

resource "google_service_account_key" "main" {
  count              = var.use_secretsmanager ? 1 : 0
  service_account_id = google_service_account.main.name
}

# Bind the IAM role roles/datastore.user to the service account
resource "google_project_iam_binding" "main" {
  project = var.project_id
  role    = "roles/datastore.user"
  members = [
    "serviceAccount:${google_service_account.main.email}"
  ]
}

# Grant the app engine default account the ability to access secret manager
resource "google_project_iam_binding" "main_secretmanager" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  members = [
    "serviceAccount:${data.google_app_engine_default_service_account.default.email}",
    "serviceAccount:${google_service_account.main.email}"
  ]
}

# Allows the main service account to view the GCP Secrets manager object
resource "google_project_iam_binding" "main_secretmanager_metadata" {
  project = var.project_id
  role    = "roles/secretmanager.viewer"
  members = [
    "serviceAccount:${data.google_app_engine_default_service_account.default.email}",
    "serviceAccount:${google_service_account.main.email}"
  ]
}

resource "google_secret_manager_secret" "main_privatekey" {
  count     = var.use_secretsmanager ? 1 : 0
  secret_id = "GOOGLE_APPLICATION_JSON"
  labels = {
    encoded = "base64"
  }
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "main_privatekey" {
  count  = var.use_secretsmanager ? 1 : 0
  secret = google_secret_manager_secret.main_privatekey[0].id

  secret_data = google_service_account_key.main[0].private_key
}

