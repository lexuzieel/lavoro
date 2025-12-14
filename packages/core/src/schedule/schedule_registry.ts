import { Cron } from 'croner'

/**
 * Cron instance registry for internal use
 */
export class ScheduleRegistry {
  private static instances: Record<string, Cron> = {}

  public static add(name: string, cron: Cron): void {
    if (this.instances[name]) {
      throw new Error(`Cron instance with name '${name}' already exists`)
    }

    this.instances[name] = cron
  }

  public static all(): Record<string, Cron> {
    return this.instances
  }

  public static get(name: string): Cron | undefined {
    return this.instances[name]
  }

  public static clear(name?: string): void {
    if (name) {
      this.instances[name]?.stop()
      delete this.instances[name]
    } else {
      Object.values(this.instances).forEach((cron) => cron.stop())
      this.instances = {}
    }
  }
}
