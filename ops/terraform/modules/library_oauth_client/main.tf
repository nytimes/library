# GCP API is VERY limited in what you can create for OAuth. Most of the steps needed to deploy the OAuth configuration must be done on console.
resource "google_iap_brand" "main" {
  support_email     = var.support_email
  application_title = var.application_title
}

# Disabling this, what happens is Terraform creates a barebones oauth client that you can't even access on the console
# Which also means you can't create authorized redirect URIs, javascript origins, etc. It's basically a useless barebones client.
# resource "google_iap_client" "main" {
#   display_name = var.oauth_client_name
#   brand        =  google_iap_brand.main.name
# }

# A Oauth client must be created manually on the console or via gcloud commands?
