# Content library on the GKE platform cluster


This directory contains the Kubernetes manifests needed to deploy the content library app onto the GKE platform cluster. Note that the Terraform code should all be applied for the respective environment you are trying to deploy before applying these manifests.


## Prerequisites

- The GCP service account must be authorized to run on the platform GKE cluster. A cluster administrator must perform this whitelisting action. If you are a cluster admin, see [this document for instructions](https://github.com/adhocteam/adhoc-gke-dev-platform/blob/main/docs/administration/authorizing_a_service_account.md) on how to authorize a GCP service account with the GKE cluster.


- The Terraform code must all be deployed
- Whoever is applying the manifests must set up the [gcloud CLI](https://cloud.google.com/sdk/gcloud), authenticate to GCP with their adhocteam.us credentials, and finally install the GKE components with `gcloud components install gke-gcloud-auth-plugin kustomize kubectl`

## Steps

1. Clone this repository locally to your machine.
2. From the repository's root directory, run `kubectl kustomize ops/platform-dev/overlays/dev` (sub out `dev` with `prod` to build the prod environment manifest) to generate the final manifest yaml to apply to the cluster. Review the manifest and ensure it looks correct.
3. Apply the manifest with `kubectl apply -k ops/platform-dev/overlays/dev` (again, sub `dev` for `prod` for the prod environment) to create the cluster resources within the GKE cluster.
4. Watch the deployment happen with `kubectl get pods -n content-library-dev`. You should see the pod come up as `running` if it deployed successfully, and `Error` or `CrashLoopBackOff` if something has gone wrong with it.

If you make any changes to the manifest and want to apply the changes, simply run these steps again. Kubernetes will take care of rolling out new changes automatically after the apply command.
## Troubleshooting a deployment

Should something go wrong with the deployment of the app on the GKE cluster there are a few ways to look into the problem.

Run `kubectl describe pod content-library-xxxxx` (you can tab complete the last part) to view the events of the pod. If the pod has run into a Kubernetes scheduling issue (i.e the pod never created because of a reason), the reason will usually be logged here.

Alternatively, if the pod created but crashed during runtime (usually because the container itself crashed), you can view the container logs with `kubectl logs content-library-xxxxx` (again, tab completion is supported and encouraged). Additionally, viewing the pod logs in [Ad Hoc's Loki instance](https://adhocteam.grafana.net/explore?orgId=1&left=%7B%22datasource%22:%22grafanacloud-logs%22,%22queries%22:%5B%7B%22refId%22:%22A%22%7D%5D,%22range%22:%7B%22from%22:%22now-1h%22,%22to%22:%22now%22%7D%7D) is another solution without the CLI.


## Restarting a deployment

If you want to restart a deployment without making any modifications to the manifest you can restart the deployment with `kubectl rollout restart content-library -n content-library-dev` (sub `dev` for `prod` for prod environments)
