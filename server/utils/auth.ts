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
  
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET 環境變量未設定，生產環境必須配置')
  }
  
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
    
    if (!config.jwtSecret) {
      console.error('JWT_SECRET 環境變量未設定')
      return null
    }
    
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
        if (existingUser.googleId) {
          return { error: '此郵箱已通過 Google 登錄，請使用 Google 登錄' }
        }
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

    // OAuth-only users have no password
    if (!user.passwordHash) {
      return { error: '此帳號使用 Google 登錄，請點擊「使用 Google 登錄」按鈕' }
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

/**
 * Google OAuth user data from Google's userinfo endpoint
 */
export interface GoogleUserInfo {
  sub: string
  email: string
  email_verified: boolean
  name: string
  given_name?: string
  family_name?: string
  picture?: string
  locale?: string
}

/**
 * Google OAuth login — 3-way match:
 * 1. googleId match → direct login
 * 2. email match → auto-merge (补上 googleId), login
 * 3. no match → create new user, login
 */
export async function googleLoginUser(googleUser: GoogleUserInfo): Promise<{ user?: AuthUser; error?: string; merged?: boolean; isNew?: boolean }> {
  try {
    await connectDB()

    if (!googleUser.email_verified) {
      return { error: 'Google 帳號郵箱未驗證，請先驗證郵箱' }
    }

    // 1. Find by googleId
    let dbUser = await User.findOne({ googleId: googleUser.sub, isActive: true })
    if (dbUser) {
      return { user: toAuthUser(dbUser) }
    }

    // 2. Find by email → auto-merge (email_verified checked above)
    dbUser = await User.findOne({ email: googleUser.email.toLowerCase(), isActive: true })
    if (dbUser) {
      dbUser.googleId = googleUser.sub
      if (!dbUser.avatarUrl && googleUser.picture) {
        dbUser.avatarUrl = googleUser.picture
      }
      await dbUser.save()
      return { user: toAuthUser(dbUser), merged: true }
    }

    // 3. Create new user — retry on duplicate key (concurrent signup race)
    const baseName = googleUser.name || googleUser.email.split('@')[0]
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const username = await generateUniqueUsername(baseName, attempt > 0)
        const newUser = await User.create({
          email: googleUser.email.toLowerCase(),
          username,
          googleId: googleUser.sub,
          displayName: googleUser.name || username,
          avatarUrl: googleUser.picture || '',
          role: 'contributor',
          dialectPermissions: [],
          contributionCount: 0,
          reviewCount: 0,
          isActive: true
        })
        return { user: toAuthUser(newUser), isNew: true }
      } catch (createErr: any) {
        if (createErr?.code === 11000 && attempt < 2) continue
        throw createErr
      }
    }

    // Unreachable — fallback to outer catch
    throw new Error('Failed to create user after retries')
  } catch (err) {
    console.error('Google login error:', err)
    return { error: 'Google 登錄失敗，請稍後重試' }
  }
}

/** Generate a unique username from a base name — appends random suffix on collision */
async function generateUniqueUsername(base: string, forceRandom = false): Promise<string> {
  // Sanitize: replace non-alphanumeric with underscore, trim
  const sanitized = base.replace(/[^a-zA-Z0-9\u4e00-\u9fff\u3400-\u4dbf_-]/g, '_').replace(/_{2,}/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'user'

  const existing = await User.findOne({ username: sanitized })
  if (!forceRandom && !existing) return sanitized

  // Append random 4-digit suffix
  for (let i = 0; i < 5; i++) {
    const suffix = Math.floor(1000 + Math.random() * 9000).toString()
    const candidate = `${sanitized.slice(0, 26)}_${suffix}`
    const dup = await User.findOne({ username: candidate })
    if (!dup) return candidate
  }

  // Fallback with timestamp
  return `${sanitized.slice(0, 20)}_${Date.now().toString(36)}`
}

/**
 * Link a Google account to an existing user (for profile page "Link Google" flow).
 * Rejects if the Google account is already linked to a different user.
 */
export async function linkGoogleToUser(
  userId: string,
  googleUser: GoogleUserInfo
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectDB()

    if (!googleUser.email_verified) {
      return { success: false, error: 'Google 帳號郵箱未驗證，請先驗證郵箱' }
    }

    // Check if googleId is already linked to another user
    const existingGoogle = await User.findOne({ googleId: googleUser.sub })
    if (existingGoogle) {
      if (existingGoogle._id.toString() !== userId) {
        return { success: false, error: '此 Google 帳號已連結到另一個用戶' }
      }
      // Already linked to this user — nothing to do
      return { success: true }
    }

    const user = await User.findById(userId)
    if (!user) return { success: false, error: '用戶不存在' }

    user.googleId = googleUser.sub
    if (!user.avatarUrl && googleUser.picture) {
      user.avatarUrl = googleUser.picture
    }
    await user.save()
    return { success: true }
  } catch (err) {
    console.error('Link Google error:', err)
    return { success: false, error: '連結失敗，請稍後重試' }
  }
}

/**
 * Unlink Google from a user. Refuses if the user has no password set
 * (would leave them with no way to log in).
 */
export async function unlinkGoogleFromUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await connectDB()

    const user = await User.findById(userId)
    if (!user) return { success: false, error: '用戶不存在' }
    if (!user.googleId) return { success: false, error: '尚未連結 Google 帳號' }
    if (!user.passwordHash) {
      return { success: false, error: '無法解除連結：請先設定密碼，否則將無法登錄' }
    }

    user.googleId = undefined
    await user.save()
    return { success: true }
  } catch (err) {
    console.error('Unlink Google error:', err)
    return { success: false, error: '解除連結失敗，請稍後重試' }
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
export function toAuthUser(user: IUser): AuthUser {
  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    dialectPermissions: (user.dialectPermissions || []).map(p => ({
      dialectName: p.dialectName,
      role: p.role ?? 'contributor'
    }))
  }
}

export async function getActiveAuthUserById(userId: string): Promise<AuthUser | null> {
  try {
    await connectDB()
    const user = await User.findOne({ _id: userId, isActive: true })
    return user ? toAuthUser(user) : null
  } catch {
    return null
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
