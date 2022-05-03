variable "support_email" {
  description = "Email address to set up as a support address for this application. Required"
  type        = string
}

variable "application_title" {
  description = "Human readable name of the application. Required."
  type        = string
}

variable "oauth_client_name" {
  description = "Name of the main OAuth 2.0 Client. Required"
  type        = string
}

# Optional variable to automatically generate an API key for the service account and store it in secrets manager
variable "use_secretsmanager" {
  description = "Set to true to generate the service account credentials and store it in secrets manager. If not set to true a manual key will need to be generated. Requires secretsmanager API to be enabled on the project first."
  type        = bool
  default     = false
}

variable "secretsmanager_resource_prefix" {
  description = "Resource prefix to append to the secretsmanager resource names. Required if using secrets manager"
  type        = string
  default     = ""
}
