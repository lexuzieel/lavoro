import { Job } from '#services/queue/contracts/job'
import logger from '@adonisjs/core/services/logger'

export class MyJob extends Job<{ arg1: string; arg2: number }> {
  async handle(payload: { arg1: string; arg2: number }): Promise<void> {
    logger.info(payload, `Processing MyJob`)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    logger.info(payload, `MyJob completed`)
  }
}
