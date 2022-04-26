variable "project_id" {
  description = "The project ID to create resources in. Required"
  type    = string
}


# Unsure what these are for, not used so will be disabling for now
# variable "client_id" {
#   type    = string
# }


# variable "client_secret" {
#   type    = string
# }


variable "region" {
  description = "The region ID to place the application in. Required"
  type = string
}

variable "database_type" {
  description = "Type of cloud firestore or cloud datastore database associated with the application. Set to either CLOUD_FIRESTORE or CLOUD_DATASTORE_COMPATIBILITY. Defaults to CLOUD_DATASTORE_COMPATIBILITY"
  type        = string
  default     = "CLOUD_DATASTORE_COMPATIBILITY"
}
