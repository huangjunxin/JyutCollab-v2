export interface AuthUserDialectPermission {
  dialectName: string
  role: 'contributor' | 'reviewer'
}

export interface AuthUser {
  id: string
  email: string
  username: string
  displayName?: string
  role: 'contributor' | 'reviewer' | 'admin'
  dialectPermissions: AuthUserDialectPermission[]
}

export interface RegisterData {
  email: string
  username: string
  password: string
  displayName?: string
  location?: string
  nativeDialect?: string
  dialect?: string
}

export interface LoginData {
  email: string
  password: string
}
