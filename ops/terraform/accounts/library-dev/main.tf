terraform {
  backend "gcs" {
    bucket = "library-state-dev"
    prefix = "terraform/state"
  }
}

module "appengine" {
  source = "../../modules/appengine/"

}

module "datastore" {
  source = "../../modules/datastore/"
}
