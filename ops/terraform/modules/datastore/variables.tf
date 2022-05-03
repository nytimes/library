variable "entity_kind" {
  description = "The entity kind to bind or apply the index to. Required."
  type        = string
}

variable "properties" {
  description = "List of property blocks to attach to the index being created. Required to have at least one property."
  type = list(object({
    name      = string
    direction = string
  }))
}
