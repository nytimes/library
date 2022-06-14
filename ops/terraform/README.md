# Deploying the library with Terragrunt

Ad Hoc uses Terragrunt which wraps around Terraform in a GCP environment to deploy the application's infrastructure. The terraform code will cover the base needs the application will use and securely expose the needed variables for the application to function either via GCP's [Secrets manager](https://cloud.google.com/secret-manager) or via Terraform outputs which are retrieved from the Terraform state.

# Deploying the infrastructure (step-by-step)

1. Ensure terragrunt and terraform are installed on your machine
2. Install [gcloud CLI] (https://cloud.google.com/sdk/gcloud) and configure it with your google credentials on GCP
3. Set your project to the desired environment for the application via the project ID (i.e `gcloud config set project nytimes-library`)
4. Initialize your terraform code with `terragrunt run-all init --terragrunt-working-directory ops/terraform/dev/us-central1`
5. Apply terragrunt changes with `terragrunt run-all apply --terragrunt-working-directory ops/terraform/dev/us-central1` and respond with `yes` on the prompt to apply the changes. (Note: You might run into an API issue after terragrunt initially applys the `library_service_api` module. This is because it might take a minute or 2 to fully enable the API on GCP and come up as available for use within Terragrunt. Simply rerun the terragrunt command if it fails for that reason.)
