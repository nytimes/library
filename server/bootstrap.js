const log = require('./logger');

(async () => {
  const gcpMetadata = require('gcp-metadata')
  const {SecretManagerServiceClient} = require('@google-cloud/secret-manager')

  // GCP Metadata is only available to the deployed instance.
  // Running locally, you would still use the .env file.
  const isDeployedInstance = await gcpMetadata.isAvailable()

  if (isDeployedInstance) {
    log.info('Running on a supported Google Cloud Platform instance...')

    // We're on GCP here.  Load up environment variables from
    // Secrets Manager
    // If GCP_PROJECT_ID is set, use the value set on the container
    // if not set, pull the project ID from the GCP metadata
    // note that on the platform dev GKE cluster, it will be the project ID
    // of the cluster, where the app container is running in.
    const projectId = process.env.GCP_PROJECT_ID ? process.env.GCP_PROJECT_ID : await gcpMetadata.project('project-id')

    log.info(`Loading environment variables for project: ${projectId}`)

    const client = new SecretManagerServiceClient()

    const parent = `projects/${projectId}`

    const [secrets] = await client.listSecrets({
      parent: parent
    })

    const waiter = []

    for (const secret of secrets) {
      const path = secret.name.split('/')
      const envVar = path[path.length - 1]

      log.info(`Loading environment variable ${envVar}`)

      waiter.push(
        getSecret(client, secret.name, secret.labels.encoded === 'base64')
          .then((value) => {
            process.env[envVar] = value
            log.info(`Loaded environment variable ${envVar}`)
          })
      )
    }

    await Promise.all(waiter)

    log.info('Environment variables loaded...')
  }

  require('./index')
})()

// Gets secrets from the GCP Secret Manager
const getSecret = async (client, name, isBase64 = false) => {
  const [version] = await client.accessSecretVersion({
    name: `${name}/versions/latest`
  })

  const payload = version.payload.data.toString('utf8')

  return isBase64 ? Buffer.from(payload, 'base64') : payload
}
