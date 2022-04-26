resource "google_datastore_index" "default" {
  kind = "foo"
  properties {
    name      = "property_a"
    direction = "ASCENDING"
  }
  properties {
    name      = "property_b"
    direction = "ASCENDING"
  }
}