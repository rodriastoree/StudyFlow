import { apiRequest } from '../lib/api/httpClient'
import type {
  CreateStudyItemRequest,
  StudyItem,
  UpdateStudyItemRequest,
} from '../types/api/studyItems'

export function getStudyItems(token: string) {
  return apiRequest<StudyItem[]>('/api/studyitems', { token })
}

export function getStudyItem(id: string, token: string) {
  return apiRequest<StudyItem>(`/api/studyitems/${encodeURIComponent(id)}`, { token })
}

export function createStudyItem(request: CreateStudyItemRequest, token: string) {
  return apiRequest<StudyItem>('/api/studyitems', {
    method: 'POST',
    body: request,
    token,
  })
}

export function updateStudyItem(id: string, request: UpdateStudyItemRequest, token: string) {
  return apiRequest<StudyItem>(`/api/studyitems/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: request,
    token,
  })
}

export function deleteStudyItem(id: string, token: string) {
  return apiRequest<void>(`/api/studyitems/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  })
}
