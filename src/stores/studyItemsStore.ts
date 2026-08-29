import { create } from 'zustand'
import { ApiError } from '@/lib/api/httpClient'
import {
  createStudyItem as createStudyItemRequest,
  deleteStudyItem as deleteStudyItemRequest,
  getStudyItems,
  updateStudyItem as updateStudyItemRequest,
} from '@/services/studyItemsService'
import type {
  CreateStudyItemRequest,
  StudyItem,
  UpdateStudyItemRequest,
} from '@/types/api/studyItems'

type StudyItemsStore = {
  items: StudyItem[]
  isLoading: boolean
  isMutating: boolean
  error: string | null
  loadItems: (token: string) => Promise<void>
  createItem: (request: CreateStudyItemRequest, token: string) => Promise<StudyItem>
  updateItem: (id: string, request: UpdateStudyItemRequest, token: string) => Promise<StudyItem>
  deleteItem: (id: string, token: string) => Promise<void>
  reset: () => void
}

const initialState = {
  items: [] as StudyItem[],
  isLoading: false,
  isMutating: false,
  error: null as string | null,
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof ApiError ? error.message : fallbackMessage
}

export const useStudyItemsStore = create<StudyItemsStore>((set) => ({
  ...initialState,

  loadItems: async (token) => {
    set({ isLoading: true, error: null })

    try {
      const items = await getStudyItems(token)
      set({ items })
    } catch (error) {
      set({ error: getErrorMessage(error, 'No se pudieron cargar tus elementos.') })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  createItem: async (request, token) => {
    set({ isMutating: true, error: null })

    try {
      const createdItem = await createStudyItemRequest(request, token)
      set((state) => ({
        items: [createdItem, ...state.items.filter((item) => item.id !== createdItem.id)]
          .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
      }))
      return createdItem
    } catch (error) {
      set({ error: getErrorMessage(error, 'No se pudo crear el elemento.') })
      throw error
    } finally {
      set({ isMutating: false })
    }
  },

  updateItem: async (id, request, token) => {
    set({ isMutating: true, error: null })

    try {
      const updatedItem = await updateStudyItemRequest(id, request, token)
      set((state) => ({
        items: state.items.map((item) => item.id === id ? updatedItem : item),
      }))
      return updatedItem
    } catch (error) {
      set({ error: getErrorMessage(error, 'No se pudo guardar el cambio. Intentá otra vez.') })
      throw error
    } finally {
      set({ isMutating: false })
    }
  },

  deleteItem: async (id, token) => {
    set({ isMutating: true, error: null })

    try {
      await deleteStudyItemRequest(id, token)
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
    } catch (error) {
      set({ error: getErrorMessage(error, 'No se pudo eliminar el elemento.') })
      throw error
    } finally {
      set({ isMutating: false })
    }
  },

  reset: () => set(initialState),
}))