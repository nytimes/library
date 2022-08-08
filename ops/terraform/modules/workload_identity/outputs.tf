output "workload_identity_pool_provider_name" {
  description = "Name of the workload identity provider"
  value       = google_iam_workload_identity_pool_provider.main.name
}

output "workload_identity_pool_name" {
  description = "Name of the workload identity pool"
  value       = google_iam_workload_identity_pool.main.name
}

output "workload_identity_pool_provider_id" {
  description = "id of the workload identity provider"
  value       = google_iam_workload_identity_pool_provider.main.id
}

output "workload_identity_pool_id" {
  description = "id of the workload identity pool"
  value       = google_iam_workload_identity_pool.main.id
}
