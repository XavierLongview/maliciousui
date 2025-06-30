declare module 'spin-wheel' {
  export class Wheel {
    constructor(container: HTMLElement, options: any)
    spin(speed?: number): void
    stop(): void
    destroy(): void
  }
} 