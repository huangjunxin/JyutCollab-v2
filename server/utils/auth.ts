import bcrypt from 'bcrypt'
import * as jose from 'jose'
import type { AuthUser, RegisterData } from './types'

const SALT_ROUNDS = 12

export interface LoginData {
  email: string
  password: string
}

// Password utilities (bcrypt; named to avoid conflict with nuxt-auth-utils's hashPassword/verifyPassword)
async function bcryptHash(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

async function bcryptVerify(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// JWT utilities using jose
export async function generateToken(userId: string): Promise<string> {
  const config = useRuntimeConfig()
  const secret = new TextEncoder().encode(config.jwtSecret)

  return await new jose.SignJWT({ userId, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const config = useRuntimeConfig()
    const secret = new TextEncoder().encode(config.jwtSecret)

    const { payload } = await jose.jwtVerify(token, secret)

    if (payload.type === 'access' && typeof payload.userId === 'string') {
      return { userId: payload.userId }
    }
    return null
  } catch {
    return null
  }
}

// User registration
export async function registerUser(data: RegisterData): Promise<{ user?: AuthUser; error?: string }> {
  try {
    await connectDB()

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: data.email.toLowerCase() }, { username: data.username }]
    })

    if (existingUser) {
      if (existingUser.email === data.email.toLowerCase()) {
        return { error: '郵箱已被註冊' }
      }
      return { error: '用户名已存在' }
    }

    const passwordHash = await bcryptHash(data.password)

    // 根據用户選擇的方言自動分配貢獻者權限
    const dialects = data.dialects && data.dialects.length > 0
      ? data.dialects
      : (data.dialect ? [data.dialect] : [])
    const dialectPermissions = dialects.map(name => ({
      dialectName: name,
      role: 'contributor' as const
    }))

    // Create user
    const newUser = await User.create({
      email: data.email.toLowerCase(),
      username: data.username,
      passwordHash,
      displayName: data.displayName || data.username,
      location: data.location || '',
      nativeDialect: data.nativeDialect || dialects[0] || '',
      role: 'contributor',
      dialectPermissions,
      contributionCount: 0,
      reviewCount: 0,
      isActive: true
    })

    return {
      user: toAuthUser(newUser)
    }
  } catch (err) {
    console.error('Registration error:', err)
    return { error: '註冊失敗，請稍後重試' }
  }
}

// User login
export async function loginUser(data: LoginData): Promise<{ user?: AuthUser; error?: string }> {
  try {
    await connectDB()

    // Find user
    const user = await User.findOne({
      email: data.email.toLowerCase(),
      isActive: true
    })

    if (!user) {
      return { error: '郵箱或密碼錯誤' }
    }

    // Verify password
    const isValid = await bcryptVerify(data.password, user.passwordHash)
    if (!isValid) {
      return { error: '郵箱或密碼錯誤' }
    }

    return {
      user: toAuthUser(user)
    }
  } catch (err) {
    console.error('Login error:', err)
    return { error: '登錄時發生錯誤' }
  }
}

// Get user by ID
export async function getUserById(userId: string): Promise<IUser | null> {
  try {
    await connectDB()
    return await User.findById(userId)
  } catch {
    return null
  }
}

// Get auth user by ID
export async function getAuthUserById(userId: string): Promise<AuthUser | null> {
  const user = await getUserById(userId)
  return user ? toAuthUser(user) : null
}

// Convert IUser to AuthUser
function toAuthUser(user: IUser): AuthUser {
  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    dialectPermissions: (user.dialectPermissions || []).map(p => ({
      dialectName: p.dialectName,
      role: p.role ?? 'contributor'
    }))
  }
}

// Check user permission
export function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    contributor: 1,
    reviewer: 2,
    admin: 3
  }

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0

  return userLevel >= requiredLevel
}

/** 方案 A：貢獻者僅能在其方言權限內建/改詞條；審核員與管理員不校驗方言 */
export function canContributeToDialect(
  auth: { role: string; dialectPermissions?: Array<{ dialectName: string }> },
  dialectName: string
): boolean {
  if (auth.role === 'reviewer' || auth.role === 'admin') return true
  const allowed = (auth.dialectPermissions || []).map(p => p.dialectName)
  return allowed.length > 0 && allowed.includes(dialectName)
}
