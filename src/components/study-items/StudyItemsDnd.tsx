import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import type { StudyItem, StudyItemStatus, StudyItemType } from '@/types/api/studyItems'

export type DraggableStudyItemRenderState = Pick<
  ReturnType<typeof useDraggable>,
  'attributes' | 'isDragging' | 'listeners' | 'setNodeRef'
>

export type DroppableStudyItemRenderState = Pick<
  ReturnType<typeof useDroppable>,
  'isOver' | 'setNodeRef'
>

type StudyItemsDndContextProps = {
  children: (activeItem: StudyItem | null) => ReactNode
  items: StudyItem[]
  itemType: StudyItemType
  allowedStatuses: readonly StudyItemStatus[]
  onStatusChange: (id: string, status: StudyItemStatus) => void | Promise<void>
  renderOverlay: (activeItem: StudyItem) => ReactNode
}

export function StudyItemsDndContext({ children, items, itemType, allowedStatuses, onStatusChange, renderOverlay }: StudyItemsDndContextProps) {
  const [activeItem, setActiveItem] = useState<StudyItem | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  }))

  function handleDragStart(event: DragStartEvent) {
    setActiveItem(items.find((item) => item.id === String(event.active.id)) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const draggedItem = items.find((item) => item.id === String(event.active.id))
    const destinationType = event.over?.data.current?.itemType
    const destinationStatus = event.over?.data.current?.status
    setActiveItem(null)

    if (!draggedItem
      || draggedItem.type !== itemType
      || draggedItem.isArchived
      || draggedItem.archivedManually
      || destinationType !== itemType
      || typeof destinationStatus !== 'string'
      || !allowedStatuses.includes(destinationStatus as StudyItemStatus)
      || destinationStatus === draggedItem.status) {
      return
    }

    void onStatusChange(draggedItem.id, destinationStatus as StudyItemStatus)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragCancel={() => setActiveItem(null)}
      onDragEnd={handleDragEnd}
    >
      {children(activeItem)}
      <DragOverlay dropAnimation={null}>
        {activeItem ? renderOverlay(activeItem) : null}
      </DragOverlay>
    </DndContext>
  )
}

export function DraggableStudyItem({ item, children }: { item: StudyItem; children: (state: DraggableStudyItemRenderState) => ReactNode }) {
  const draggable = useDraggable({
    id: item.id,
    data: { itemType: item.type, status: item.status },
  })

  return children(draggable)
}

export function DroppableStudyItemStatus({ itemType, status, children }: { itemType: StudyItemType; status: StudyItemStatus; children: (state: DroppableStudyItemRenderState) => ReactNode }) {
  const droppable = useDroppable({
    id: `${itemType}:${status}`,
    data: { itemType, status },
  })

  return children(droppable)
}