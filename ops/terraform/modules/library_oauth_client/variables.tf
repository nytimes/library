variable "support_email" {
  description = "Email address to set up as a support address for this application. Required"
  type = string
}

variable "application_title" {
  description = "Human readable name of the application. Required."
  type = string
}

variable "oauth_client_name" {
  description = "Name of the main OAuth 2.0 Client. Required"
  type = string
}
