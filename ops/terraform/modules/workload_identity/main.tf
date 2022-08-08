resource "google_iam_workload_identity_pool" "main" {
  workload_identity_pool_id = var.identity_pool_id
  display_name              = var.identity_pool_display_name
  description               = var.identity_pool_description
  disabled                  = false
}


resource "google_iam_workload_identity_pool_provider" "main" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.main.workload_identity_pool_id
  workload_identity_pool_provider_id = var.identity_pool_id
  display_name                       = var.identity_pool_display_name
  description                        = var.identity_pool_description
  disabled                           = false
  attribute_mapping                  = var.identity_provider_attribute_mapping

  dynamic "aws" {
    for_each = var.aws_account_ids != null ? var.aws_account_ids : []
    content {
      account_id = aws.value
    }
  }

  dynamic "oidc" {
    for_each = var.oidc_issuer_uri != null ? [true] : []
    content {
      allowed_audiences = var.oidc_allowed_audiences != null ? [for audience in var.oidc_allowed_audiences : audience] : []
      issuer_uri        = var.oidc_issuer_uri
    }
  }
}

resource "google_service_account_iam_binding" "main" {
  count              = var.service_account_bind_email != null ? 1 : 0
  service_account_id = var.service_account_bind_email
  role               = "roles/iam.workloadIdentityUser"
  members            = [replace(var.service_account_bind_member_string, "%%%%", google_iam_workload_identity_pool.main.name)]
}
