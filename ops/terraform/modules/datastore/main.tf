# Creates the datastore indexes needed for the application to function
resource "google_datastore_index" "main" {
  kind = var.entity_kind

  dynamic "properties" {
    for_each = var.properties[*]
    content {
      name = lookup(auth.value, "name", null)
      direction = lookup(auth.value, "direction", null)
    }
  }
}
