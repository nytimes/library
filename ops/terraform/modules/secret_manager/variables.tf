variable "project_id" {
  description = "ID of the project. Required."
  type        = string
}

variable "plaintext_secret_resources" {
  description = "A list of key value pairs to create secret manager resources from. To avoid putting a value in from Terraform, just leave the value part blank."
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "sensitive_secret_resources" {
  description = "A list of names to create plaintext encoded secret manager resources but set a value for them outside of TF."
  type        = list(string)
  default     = []
}

variable "base64_encoded_secrets" {
  description = "A list of names to create a base64 encoded labeled secret manager resource. NOT a map!"
  type        = list(string)
  default     = []
}
