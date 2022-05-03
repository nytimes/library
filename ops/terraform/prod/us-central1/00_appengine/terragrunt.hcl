terraform {
  source = "${get_parent_terragrunt_dir()}//modules//appengine"
}

include {
  path = find_in_parent_folders()
}

inputs = {
}
