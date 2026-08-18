import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import './App.css'

type ItemType = 'task' | 'material'
type ItemStatus = 'pending' | 'completed' | 'to-summarize' | 'summarized' | 'printed'
type StudyItem = { id: string; type: ItemType; title: string; subject: string; status: ItemStatus; printedAt?: string; archivedManually?: boolean }
type StatusColumn = { value: ItemStatus; label: string; color: string }

const storageKey = 'studyflow-items'
const archiveAfterDays = 30
const initialItems: StudyItem[] = [
  { id: 'task-1', type: 'task', title: 'Ejercicios de práctica', subject: 'Programación I', status: 'pending' },
  { id: 'task-2', type: 'task', title: 'Preparar parcial', subject: 'Matemática', status: 'pending' },
  { id: 'task-3', type: 'task', title: 'Práctica de algoritmos', subject: 'Programación I', status: 'completed' },
  { id: 'material-1', type: 'material', title: 'Clase 5: Normalización', subject: 'Bases de datos', status: 'to-summarize' },
  { id: 'material-2', type: 'material', title: 'Resumen de funciones', subject: 'Matemática', status: 'summarized' },
  { id: 'material-3', type: 'material', title: 'Modelo entidad-relación', subject: 'Bases de datos', status: 'printed', printedAt: new Date().toISOString() },
]
const taskStatuses = [{ value: 'pending', label: 'Pendiente', color: 'amber' }, { value: 'completed', label: 'Completada', color: 'green' }] as const
const materialStatuses = [{ value: 'to-summarize', label: 'Por resumir', color: 'violet' }, { value: 'summarized', label: 'Resumido', color: 'blue' }, { value: 'printed', label: 'Impreso', color: 'slate' }] as const

function getInitialItems() {
  try { const savedItems = localStorage.getItem(storageKey); const items = savedItems ? (JSON.parse(savedItems) as StudyItem[]) : initialItems; return items.map((item) => item.type === 'material' && item.status === 'printed' && !item.printedAt ? { ...item, printedAt: new Date().toISOString() } : item) } catch { return initialItems }
}

function Board({ columns, items, itemType, draggedItem, dropTarget, onPointerDown, onPointerMove, onPointerUp, onArchive, onRestore }: { columns: readonly StatusColumn[]; items: StudyItem[]; itemType: ItemType; draggedItem: StudyItem | null; dropTarget: ItemStatus | null; onPointerDown: (event: PointerEvent<HTMLElement>, item: StudyItem) => void; onPointerMove: (event: PointerEvent<HTMLElement>) => void; onPointerUp: (event: PointerEvent<HTMLElement>) => void; onArchive?: (id: string) => void; onRestore?: (id: string) => void }) {
  return <div className={`board columns-${columns.length}`}>{columns.map((column) => {
    const columnItems = items.filter((item) => item.status === column.value)
    const isDropTarget = dropTarget === column.value && draggedItem?.type === itemType
    return <section className={`board-column ${isDropTarget ? 'is-drop-target' : ''}`} data-drop-status={column.value} data-drop-type={itemType} key={column.value}><div className="column-heading"><span className={`status-dot ${column.color}`} aria-hidden="true" /><h3>{column.label}</h3><span className="task-count">{columnItems.length}</span></div><div className="task-list">{columnItems.length === 0 ? <p className="empty-column">Soltá un elemento aquí.</p> : columnItems.map((item) => <article className={`task-card ${draggedItem?.id === item.id ? 'is-dragging' : ''}`} key={item.id} onPointerDown={(event) => onPointerDown(event, item)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}><div className="card-topline"><p className="subject">{item.subject}</p><span className="drag-handle" aria-hidden="true">⠿</span></div><h4>{item.title}</h4><p className="drag-hint">Mantené y arrastrá para mover</p>{item.type === 'material' && item.status === 'printed' && onArchive && <button className="card-action" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onArchive(item.id)}>Archivar ahora</button>}{onRestore && <button className="card-action" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onRestore(item.id)}>Mostrar 30 días</button>}</article>)}</div></section>
  })}</div>
}

function App() {
  const [items, setItems] = useState<StudyItem[]>(getInitialItems)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [itemType, setItemType] = useState<ItemType>('task')
  const [itemStatus, setItemStatus] = useState<ItemStatus>('pending')
  const [showArchived, setShowArchived] = useState(false)
  const [draggedItem, setDraggedItem] = useState<StudyItem | null>(null)
  const [dropTarget, setDropTarget] = useState<ItemStatus | null>(null)
  const dragPositionRef = useRef({ x: 0, y: 0 })
  const dragOverlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(items)) }, [items])
  useLayoutEffect(() => {
    if (draggedItem && dragOverlayRef.current) {
      dragOverlayRef.current.style.left = `${dragPositionRef.current.x}px`
      dragOverlayRef.current.style.top = `${dragPositionRef.current.y}px`
    }
  }, [draggedItem, dropTarget])
  const tasks = items.filter((item) => item.type === 'task')
  const materials = items.filter((item) => item.type === 'material')
  const isArchived = (item: StudyItem) => item.archivedManually || (item.status === 'printed' && Boolean(item.printedAt) && Date.now() - new Date(item.printedAt!).getTime() >= archiveAfterDays * 24 * 60 * 60 * 1000)
  const archivedPrinted = materials.filter(isArchived)
  const activeMaterials = materials.filter((item) => !isArchived(item))
  const pendingCount = tasks.filter((item) => item.status === 'pending').length
  const toSummarizeCount = activeMaterials.filter((item) => item.status === 'to-summarize').length
  const readyToPrintCount = activeMaterials.filter((item) => item.status === 'summarized').length
  const availableStatuses = itemType === 'task' ? taskStatuses : materialStatuses

  const updateStatus = (id: string, status: ItemStatus) => setItems((currentItems) => currentItems.map((item) => { if (item.id !== id) return item; if (status === 'printed' && item.status !== 'printed') return { ...item, status, printedAt: new Date().toISOString(), archivedManually: false }; if (status !== 'printed') return { ...item, status, printedAt: undefined, archivedManually: false }; return { ...item, status } }))
  const archiveItem = (id: string) => setItems((currentItems) => currentItems.map((item) => item.id === id ? { ...item, archivedManually: true } : item))
  const restoreItem = (id: string) => setItems((currentItems) => currentItems.map((item) => item.id === id ? { ...item, archivedManually: false, printedAt: new Date().toISOString() } : item))
  function changeItemType(type: ItemType) { setItemType(type); setItemStatus(type === 'task' ? 'pending' : 'to-summarize') }
  function createItem(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const formData = new FormData(event.currentTarget); const title = String(formData.get('title') ?? '').trim(); const subject = String(formData.get('subject') ?? '').trim(); if (!title || !subject) return; setItems((currentItems) => [...currentItems, { id: crypto.randomUUID(), type: itemType, title, subject, status: itemStatus, printedAt: itemStatus === 'printed' ? new Date().toISOString() : undefined }]); setIsFormOpen(false); event.currentTarget.reset() }
  function findDropTarget(x: number, y: number, type: ItemType) { const target = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-status]'); return target?.dataset.dropType === type ? target.dataset.dropStatus as ItemStatus : null }
  function updatePreview(x: number, y: number) { dragPositionRef.current = { x, y }; if (dragOverlayRef.current) { dragOverlayRef.current.style.left = `${x}px`; dragOverlayRef.current.style.top = `${y}px` } }
  function startPointerDrag(event: PointerEvent<HTMLElement>, item: StudyItem) { if ((event.target as HTMLElement).closest('button')) return; event.currentTarget.setPointerCapture(event.pointerId); updatePreview(event.clientX, event.clientY); setDraggedItem(item); setDropTarget(findDropTarget(event.clientX, event.clientY, item.type)) }
  function movePointerDrag(event: PointerEvent<HTMLElement>) { if (!draggedItem) return; updatePreview(event.clientX, event.clientY); const target = findDropTarget(event.clientX, event.clientY, draggedItem.type); setDropTarget((current) => current === target ? current : target) }
  function endPointerDrag(event: PointerEvent<HTMLElement>) { if (draggedItem) { const target = findDropTarget(event.clientX, event.clientY, draggedItem.type); if (target) updateStatus(draggedItem.id, target) } setDraggedItem(null); setDropTarget(null) }

  return <main className="app-shell">
    <header className="topbar"><div><p className="eyebrow">TU ORGANIZADOR ACADÉMICO</p><h1>StudyFlow</h1></div><button className="primary-button" type="button" onClick={() => setIsFormOpen(true)}>+ Nuevo elemento</button></header>
    <section className="welcome" aria-labelledby="welcome-title"><div><p className="day-label">TU ESPACIO DE ORGANIZACIÓN</p><h2 id="welcome-title">Tu tablero de estudio</h2><p>Tomá una tarjeta y llevala al siguiente estado.</p></div><div className="summary" aria-label="Resumen de tareas"><div><strong>{pendingCount}</strong><span>Pendientes</span></div><div><strong>{toSummarizeCount}</strong><span>Por resumir</span></div><div><strong>{readyToPrintCount}</strong><span>Para imprimir</span></div></div></section>
    <section className="board-section" aria-labelledby="tasks-title"><div className="section-heading"><div><p className="eyebrow">ACTIVIDADES</p><h2 id="tasks-title">Mis tareas</h2></div><span className="section-note">Mantené y arrastrá entre columnas</span></div><Board columns={taskStatuses} items={tasks} itemType="task" draggedItem={draggedItem} dropTarget={dropTarget} onPointerDown={startPointerDrag} onPointerMove={movePointerDrag} onPointerUp={endPointerDrag} /></section>
    <section className="board-section materials-section" aria-labelledby="materials-title"><div className="section-heading"><div><p className="eyebrow">MATERIAL DE ESTUDIO</p><h2 id="materials-title">Resúmenes e impresiones</h2></div><span className="section-note">Mantené y arrastrá entre columnas</span></div><Board columns={materialStatuses} items={activeMaterials} itemType="material" draggedItem={draggedItem} dropTarget={dropTarget} onPointerDown={startPointerDrag} onPointerMove={movePointerDrag} onPointerUp={endPointerDrag} onArchive={archiveItem} />{archivedPrinted.length > 0 && <div className="archive-area"><button className="archive-button" type="button" onClick={() => setShowArchived((current) => !current)}>{showArchived ? 'Ocultar impresos archivados' : `Ver impresos archivados (${archivedPrinted.length})`}</button><p>Se archivan automáticamente después de {archiveAfterDays} días o manualmente cuando lo decidas.</p>{showArchived && <Board columns={[{ value: 'printed', label: 'Impresos archivados', color: 'slate' }]} items={archivedPrinted} itemType="material" draggedItem={draggedItem} dropTarget={dropTarget} onPointerDown={startPointerDrag} onPointerMove={movePointerDrag} onPointerUp={endPointerDrag} onRestore={restoreItem} />}</div>}</section>
    {draggedItem && createPortal(<div className="drag-overlay" ref={dragOverlayRef}><p>{draggedItem.subject}</p><strong>{draggedItem.title}</strong><span>Soltá para mover</span></div>, document.body)}
    {isFormOpen && <div className="modal-backdrop" role="presentation"><section className="creation-modal" role="dialog" aria-modal="true" aria-labelledby="form-title"><button className="close-button" type="button" aria-label="Cerrar" onClick={() => setIsFormOpen(false)}>×</button><p className="eyebrow">NUEVO ELEMENTO</p><h2 id="form-title">¿Qué querés agregar?</h2><form onSubmit={createItem}><label>Tipo de elemento<select value={itemType} onChange={(event) => changeItemType(event.target.value as ItemType)}><option value="task">Tarea</option><option value="material">Material de estudio</option></select></label><label>Estado inicial<select value={itemStatus} onChange={(event) => setItemStatus(event.target.value as ItemStatus)}>{availableStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label><p className="form-help">Elegí el estado actual aunque el elemento no siga todo el flujo desde el comienzo.</p><label>Título<input name="title" placeholder={itemType === 'task' ? 'Ej.: Resolver guía 4' : 'Ej.: Clase 6: Relaciones'} required autoFocus /></label><label>Materia<input name="subject" placeholder="Ej.: Programación I" required /></label><div className="form-actions"><button className="text-button" type="button" onClick={() => setIsFormOpen(false)}>Cancelar</button><button className="primary-button" type="submit">Crear {itemType === 'task' ? 'tarea' : 'material'}</button></div></form></section></div>}
  </main>
}

export default App
