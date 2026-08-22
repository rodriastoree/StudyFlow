export type StudyItemType = 'task' | 'material'

export type StudyItemStatus = 'pending' | 'completed' | 'to-summarize' | 'summarized' | 'printed'

export type StudyItem = {
  id: string
  userId: string
  type: StudyItemType
  title: string
  subject: string
  status: StudyItemStatus
  printedAt: string | null
  archivedManually: boolean
  createdAt: string
  updatedAt: string
}

export type CreateStudyItemRequest = {
  type: StudyItemType
  title: string
  subject: string
  status: StudyItemStatus
  printedAt: string | null
}

export type UpdateStudyItemRequest = {
  type: StudyItemType
  title: string
  subject: string
  status: StudyItemStatus
  printedAt: string | null
  archivedManually: boolean
}
