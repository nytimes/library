# Creates the datastore indexes needed for the application to function
resource "google_datastore_index" "main" {
  kind = var.entity_kind

  dynamic "properties" {
    for_each = var.properties[*]
    content {
      name      = lookup(properties.value, "name", null)
      direction = lookup(properties.value, "direction", null)
    }
  }
}
