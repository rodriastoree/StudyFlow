import { apiRequest } from '../lib/api/httpClient'
import type { AuthenticationResponse, ConfirmEmailRequest, LoginRequest, MessageResponse, RegisterRequest } from '../types/api/auth'

export function register(request: RegisterRequest) {
  return apiRequest<AuthenticationResponse>('/api/auth/register', {
    method: 'POST',
    body: request,
  })
}

export function login(request: LoginRequest) {
  return apiRequest<AuthenticationResponse>('/api/auth/login', {
    method: 'POST',
    body: request,
  })
}

export function confirmEmail(request: ConfirmEmailRequest) {
  return apiRequest<MessageResponse>('/api/auth/confirm-email', {
    method: 'POST',
    body: request,
  })
}
