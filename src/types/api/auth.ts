export type RegisterRequest = {
  email: string
  password: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type AuthenticationResponse = {
  message: string
  token: string | null
  expiresAt: string | null
  requiresEmailConfirmation: boolean
  errors: string[]
}
