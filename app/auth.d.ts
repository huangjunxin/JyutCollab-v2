import type { AuthUser } from './types/auth'

declare module '#auth-utils' {
  interface User extends AuthUser {}
}

export {}
