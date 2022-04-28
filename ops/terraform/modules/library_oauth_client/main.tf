resource "google_iap_brand" "main" {
  support_email     = var.support_email
  application_title = var.application_title
}

resource "google_iap_client" "main" {
  display_name = var.oauth_client_name
  brand        =  google_iap_brand.main.name
}
