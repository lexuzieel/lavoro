import pDefer, { DeferredPromise } from 'p-defer'

const mutexes = new Map<string, DeferredPromise<void>>()

export function acquireMutex(key: string): void {
  mutexes.set(key, pDefer())
}

export function releaseMutex(key: string): void {
  mutexes.get(key)?.resolve()
}

export async function waitForMutex(
  key: string,
  timeoutMs: number = 5000,
): Promise<void> {
  await Promise.race([
    mutexes.get(key)?.promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Mutex '${key}' timeout after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ])
}
