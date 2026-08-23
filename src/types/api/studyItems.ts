export type StudyItemType = 'task' | 'material' | 'practical-work' | 'exam'

export type StudyItemStatus = 'pending' | 'completed' | 'to-summarize' | 'summarized' | 'printed'

export type StudyItemExamType = 'partial' | 'final' | 'recovery'

export type StudyItem = {
  id: string
  userId: string
  type: StudyItemType
  title: string
  subject: string
  status: StudyItemStatus
  dueDate: string | null
  examType: StudyItemExamType | null
  examInstance: string | null
  printedAt: string | null
  isArchived: boolean
  archivedAt: string | null
  archivedManually: boolean
  createdAt: string
  updatedAt: string
}

export type CreateStudyItemRequest = {
  type: StudyItemType
  title: string | null
  subject: string
  status: StudyItemStatus
  dueDate: string | null
  examType: StudyItemExamType | null
  examInstance: string | null
}

export type UpdateStudyItemRequest = {
  type: StudyItemType
  title: string | null
  subject: string
  status: StudyItemStatus
  dueDate: string | null
  examType: StudyItemExamType | null
  examInstance: string | null
  isArchived?: boolean
  archivedManually?: boolean
}
