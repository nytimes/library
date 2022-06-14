variable "project_id" {
  description = "ID of the project. Required."
  type        = string
}
variable "service_account_id" {
  description = "Unique ID to attach to the service account that will be created. Must be unique and required."
  type        = string
}

variable "service_account_display_name" {
  description = "Display name of the service account. Required."
  type        = string
}

variable "service_account_description" {
  description = "Helpful description of the service account. Defaults to a somewhat descriptive string if nothing is passed"
  type        = string
  default     = "Main service account for the library application"
}

# Optional variable to automatically generate an API key for the service account and store it in secrets manager
variable "use_secretsmanager" {
  description = "Set to true to generate the service account credentials and store it in secrets manager. If not set to true a manual key will need to be generated. Requires secretsmanager API to be enabled on the project first."
  type        = bool
  default     = false
}
