import { getDbConnection } from '@crowd/database'
import { getServiceLogger } from '@crowd/logging'
import { SearchSyncWorkerEmitter, getSqsClient } from '@crowd/sqs'
import { DB_CONFIG, OPENSEARCH_CONFIG, SQS_CONFIG } from './conf'
import { WorkerQueueReceiver } from './queue'
import { getOpensearchClient } from '@crowd/opensearch'

const log = getServiceLogger()

const MAX_CONCURRENT_PROCESSING = 2

setImmediate(async () => {
  log.info('Starting integration sync worker...')

  const sqsClient = getSqsClient(SQS_CONFIG())

  const dbConnection = getDbConnection(DB_CONFIG(), MAX_CONCURRENT_PROCESSING)

  const opensearchClient = getOpensearchClient(OPENSEARCH_CONFIG())

  const searchSyncWorkerEmitter = new SearchSyncWorkerEmitter(sqsClient, log)

  const worker = new WorkerQueueReceiver(
    sqsClient,
    dbConnection,
    opensearchClient,
    searchSyncWorkerEmitter,
    log,
    MAX_CONCURRENT_PROCESSING,
  )

  try {
    await searchSyncWorkerEmitter.init()
    await worker.start()
  } catch (err) {
    log.error(err, 'Failed to start!')
    process.exit(1)
  }
})
