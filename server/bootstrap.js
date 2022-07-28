const log = require('./logger');

(async () => {
  const gcpMetadata = require('gcp-metadata')
  const {SecretManagerServiceClient} = require('@google-cloud/secret-manager')

  // GCP Metadata is only available to the deployed instance.
  // Running locally, you would still use the .env file.
  const isDeployedInstance = await gcpMetadata.isAvailable()

  if (isDeployedInstance) {
    log.info('App Engine deployed instance detected...')

    // We're on GCP here.  Load up environment variables from
    // Secrets Manager
    const projectId = await gcpMetadata.project('project-id')

    log.info(`Loading environment variables for project: ${projectId}`)

    const client = new SecretManagerServiceClient()

    const parent = `projects/${projectId}`

    const [secrets] = await client.listSecrets({
      parent: parent
    })

    for (const secret of secrets) {
      const path = secret.name.split('/')
      const envVar = path[path.length - 1]

      log.info(`Loading environment variable ${envVar}`)

      process.env[envVar] = await getSecret(client, secret.name, secret.labels.encoded === 'base64')
    }

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
