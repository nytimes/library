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
  secret_id = "${var.service_account_id}-public-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "main_publickey" {
  count = var.use_secretsmanager ? 1 : 0
  secret = google_secret_manager_secret.main_publickey[0].id

  secret_data = google_service_account_key.main[0].public_key
}

resource "google_secret_manager_secret" "main_privatekey" {
  count = var.use_secretsmanager ? 1 : 0
  secret_id = "${var.service_account_id}-private-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "main_privatekey" {
  count = var.use_secretsmanager ? 1 : 0
  secret = google_secret_manager_secret.main_privatekey[0].id

  secret_data = google_service_account_key.main[0].private_key
}

