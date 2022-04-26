resource "google_service_account" "main" {
  account_id   = var.service_account_id
  display_name = var.service_account_display_name
  description  = var.service_account_description
}


resource "google_service_account_key" "main" {
  count = var.use_secretsmanager ? 1 : 0
  service_account_id = google_service_account.main.name
}

resource "google_secret_manager_secret" "main_publickey" {
  count = var.use_secretsmanager ? 1 : 0
  secret_id = "/service_account/${var.service_account_id}/PUBLIC_KEY"
}

resource "google_secret_manager_secret_version" "main_publickey" {
  count = var.use_secretsmanager ? 1 : 0
  secret = google_secret_manager_secret.main_publickey.id

  secret_data = google_service_account_key.main.public_key
}

resource "google_secret_manager_secret" "main_privatekey" {
  count = var.use_secretsmanager ? 1 : 0
  secret_id = "${var.service_account_id}/PRIVATE_KEY"
}

resource "google_secret_manager_secret_version" "main_privatekey" {
  count = var.use_secretsmanager ? 1 : 0
  secret = google_secret_manager_secret.main_privatekey.id

  secret_data = google_service_account_key.main.private_key
}

