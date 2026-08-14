/// <reference types="vite/client" />

import type { JanitorApi } from '../preload/bridge'

declare global {
  interface Window {
    janitor: JanitorApi
  }
}

export {}
