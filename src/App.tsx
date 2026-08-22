import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { clearAuthSession, persistAuthSession, restoreAuthSession } from './lib/auth/authStorage'
import type { AuthSession } from './lib/auth/authStorage'
import { ApiError } from './lib/api/httpClient'
import { login, register } from './services/authService'
import { createStudyItem, deleteStudyItem, getStudyItems, updateStudyItem } from './services/studyItemsService'
import type { StudyItem, StudyItemStatus as ItemStatus, StudyItemType as ItemType } from './types/api/studyItems'
import './App.css'

type StatusColumn = { value: ItemStatus; label: string; color: string }

const archiveAfterDays = 30
const taskStatuses = [{ value: 'pending', label: 'Pendiente', color: 'amber' }, { value: 'completed', label: 'Completada', color: 'green' }] as const
const materialStatuses = [{ value: 'to-summarize', label: 'Por resumir', color: 'violet' }, { value: 'summarized', label: 'Resumido', color: 'blue' }, { value: 'printed', label: 'Impreso', color: 'slate' }] as const

function Board({ columns, items, itemType, draggedItem, dropTarget, onPointerDown, onPointerMove, onPointerUp, onArchive, onRestore, onDelete }: { columns: readonly StatusColumn[]; items: StudyItem[]; itemType: ItemType; draggedItem: StudyItem | null; dropTarget: ItemStatus | null; onPointerDown: (event: PointerEvent<HTMLElement>, item: StudyItem) => void; onPointerMove: (event: PointerEvent<HTMLElement>) => void; onPointerUp: (event: PointerEvent<HTMLElement>) => void; onArchive?: (id: string) => void; onRestore?: (id: string) => void; onDelete: (item: StudyItem) => void }) {
  return <div className={`board columns-${columns.length}`}>{columns.map((column) => { const columnItems = items.filter((item) => item.status === column.value); const isDropTarget = dropTarget === column.value && draggedItem?.type === itemType; return <section className={`board-column ${isDropTarget ? 'is-drop-target' : ''}`} data-drop-status={column.value} data-drop-type={itemType} key={column.value}><div className="column-heading"><span className={`status-dot ${column.color}`} /><h3>{column.label}</h3><span className="task-count">{columnItems.length}</span></div><div className="task-list">{columnItems.length === 0 ? <p className="empty-column">Soltá un elemento aquí.</p> : columnItems.map((item) => <article className={`task-card ${draggedItem?.id === item.id ? 'is-dragging' : ''}`} key={item.id} onPointerDown={(event) => onPointerDown(event, item)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}><div className="card-topline"><p className="subject">{item.subject}</p><div className="card-controls"><button className="delete-button" type="button" aria-label={`Eliminar ${item.title}`} title="Eliminar" onPointerDown={(event) => event.stopPropagation()} onClick={() => onDelete(item)}>×</button><span className="drag-handle" aria-hidden="true">⠿</span></div></div><h4>{item.title}</h4><p className="drag-hint">Mantené y arrastrá para mover</p>{item.type === 'material' && item.status === 'printed' && onArchive && <button className="card-action" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onArchive(item.id)}>Archivar ahora</button>}{onRestore && <button className="card-action" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onRestore(item.id)}>Mostrar 30 días</button>}</article>)}</div></section> })}</div>
}

function App() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null)
  const [items, setItems] = useState<StudyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authMessage, setAuthMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [itemType, setItemType] = useState<ItemType>('task')
  const [itemStatus, setItemStatus] = useState<ItemStatus>('pending')
  const [showArchived, setShowArchived] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<StudyItem | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [draggedItem, setDraggedItem] = useState<StudyItem | null>(null)
  const [dropTarget, setDropTarget] = useState<ItemStatus | null>(null)
  const dragPositionRef = useRef({ x: 0, y: 0 })
  const dragOverlayRef = useRef<HTMLDivElement>(null)

  const handleApiError = (apiError: unknown, fallbackMessage: string) => { if (apiError instanceof ApiError && apiError.status === 401) { logout(); return }; setError(apiError instanceof ApiError ? apiError.message : fallbackMessage) }
  const loadItems = async (token: string) => { try { const loadedItems = await getStudyItems(token); setItems(loadedItems) } catch (apiError) { handleApiError(apiError, 'No se pudieron cargar tus elementos.') } }
  useEffect(() => { const restoredSession = restoreAuthSession(); setAuthSession(restoredSession); setLoading(false); if (restoredSession) void loadItems(restoredSession.token) }, [])
  useEffect(() => { if (!authSession) return; const remainingLifetime = Date.parse(authSession.expiresAt) - Date.now(); if (remainingLifetime <= 0) { logout(); return }; const timeout = window.setTimeout(logout, Math.min(remainingLifetime, 2147483647)); return () => window.clearTimeout(timeout) }, [authSession])
  useLayoutEffect(() => { if (draggedItem && dragOverlayRef.current) { dragOverlayRef.current.style.left = `${dragPositionRef.current.x}px`; dragOverlayRef.current.style.top = `${dragPositionRef.current.y}px` } }, [draggedItem, dropTarget])

  const tasks = items.filter((item) => item.type === 'task')
  const materials = items.filter((item) => item.type === 'material')
  const isArchived = (item: StudyItem) => item.archivedManually || (item.status === 'printed' && Boolean(item.printedAt) && Date.now() - new Date(item.printedAt!).getTime() >= archiveAfterDays * 86400000)
  const archivedPrinted = materials.filter(isArchived); const activeMaterials = materials.filter((item) => !isArchived(item)); const pendingCount = tasks.filter((item) => item.status === 'pending').length; const toSummarizeCount = activeMaterials.filter((item) => item.status === 'to-summarize').length; const readyToPrintCount = activeMaterials.filter((item) => item.status === 'summarized').length; const availableStatuses = itemType === 'task' ? taskStatuses : materialStatuses
  const updateRemote = async (id: string, changes: Partial<Pick<StudyItem, 'status' | 'printedAt' | 'archivedManually'>>) => { if (!authSession) return; const current = items.find((item) => item.id === id); if (!current) return; try { await updateStudyItem(id, { type: current.type, title: current.title, subject: current.subject, status: changes.status ?? current.status, printedAt: changes.printedAt !== undefined ? changes.printedAt : current.printedAt, archivedManually: changes.archivedManually ?? current.archivedManually }, authSession.token); await loadItems(authSession.token) } catch (apiError) { handleApiError(apiError, 'No se pudo guardar el cambio. Intentá otra vez.') } }
  const updateStatus = async (id: string, status: ItemStatus) => { const current = items.find((item) => item.id === id); if (!current) return; await updateRemote(id, { status, printedAt: status === 'printed' ? current.status === 'printed' ? current.printedAt : new Date().toISOString() : null, archivedManually: false }) }
  const archiveItem = async (id: string) => updateRemote(id, { archivedManually: true })
  const restoreItem = async (id: string) => updateRemote(id, { archivedManually: false, printedAt: new Date().toISOString() })
  const deleteItem = async () => { if (!itemToDelete || !authSession) return; try { await deleteStudyItem(itemToDelete.id, authSession.token); setItems((current) => current.filter((item) => item.id !== itemToDelete.id)); setItemToDelete(null) } catch (apiError) { handleApiError(apiError, 'No se pudo eliminar el elemento.') } }
  function changeItemType(type: ItemType) { setItemType(type); setItemStatus(type === 'task' ? 'pending' : 'to-summarize') }
  async function createItem(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!authSession) return; const form = new FormData(event.currentTarget); const title = String(form.get('title') ?? '').trim(); const subject = String(form.get('subject') ?? '').trim(); if (!title || !subject) return; try { await createStudyItem({ type: itemType, title, subject, status: itemStatus, printedAt: itemStatus === 'printed' ? new Date().toISOString() : null }, authSession.token); setIsFormOpen(false); await loadItems(authSession.token) } catch (apiError) { handleApiError(apiError, 'No se pudo crear el elemento.') } }
  async function submitAuth(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const email = String(form.get('email') ?? '').trim(); const password = String(form.get('password') ?? ''); setAuthMessage(null); try { if (isRegistering) { const response = await register({ email, password }); setAuthMessage({ text: response.message, type: 'success' }); return } const response = await login({ email, password }); const nextSession = persistAuthSession(response, email); setAuthSession(nextSession); void loadItems(nextSession.token) } catch (authError) { const message = authError instanceof ApiError || authError instanceof Error ? authError.message : 'No se pudo completar la autenticación.'; setAuthMessage({ text: message, type: 'error' }) } }
  function logout() { clearAuthSession(); setAuthSession(null); setItems([]); setError(''); setShowSettings(false); setIsFormOpen(false); setItemToDelete(null); setDraggedItem(null); setDropTarget(null) }
  const updatePreview = (x: number, y: number) => { dragPositionRef.current = { x, y }; if (dragOverlayRef.current) { dragOverlayRef.current.style.left = `${x}px`; dragOverlayRef.current.style.top = `${y}px` } }
  const findDropTarget = (x: number, y: number, type: ItemType) => { const target = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-status]'); return target?.dataset.dropType === type ? target.dataset.dropStatus as ItemStatus : null }
  function startPointerDrag(event: PointerEvent<HTMLElement>, item: StudyItem) { if ((event.target as HTMLElement).closest('button')) return; event.currentTarget.setPointerCapture(event.pointerId); updatePreview(event.clientX, event.clientY); setDraggedItem(item); setDropTarget(findDropTarget(event.clientX, event.clientY, item.type)) }
  function movePointerDrag(event: PointerEvent<HTMLElement>) { if (!draggedItem) return; updatePreview(event.clientX, event.clientY); const target = findDropTarget(event.clientX, event.clientY, draggedItem.type); setDropTarget((current) => current === target ? current : target) }
  function endPointerDrag(event: PointerEvent<HTMLElement>) { if (draggedItem) { const target = findDropTarget(event.clientX, event.clientY, draggedItem.type); if (target) void updateStatus(draggedItem.id, target) } setDraggedItem(null); setDropTarget(null) }

  if (loading) return <main className="flex min-h-screen items-center justify-center p-6"><p>Cargando StudyFlow…</p></main>
  if (!authSession) return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-[440px] gap-0 rounded-[18px] border border-[#34405a] bg-[rgba(25,31,43,0.94)] py-0 text-[#edf0f7] shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-0">
        <CardHeader className="gap-0 px-8 pt-8 pb-0">
          <p className="mb-[9px] text-[0.72rem] font-[750] tracking-[0.1em] text-[#b7c2ff]">STUDYFLOW</p>
          <h1 className="mb-[9px] text-[1.65rem] leading-tight tracking-[-0.05em]">{isRegistering ? 'Creá tu cuenta' : 'Bienvenido de nuevo'}</h1>
          <p className="leading-6 text-[#a9b5c8]">{isRegistering ? 'Guardá tu progreso y accedé desde cualquier dispositivo.' : 'Iniciá sesión para ver tu tablero.'}</p>
        </CardHeader>
        <CardContent className="px-8 pt-[26px] pb-8">
          <form className="grid gap-4" onSubmit={submitAuth}>
            <Label className="grid gap-[7px] text-[0.84rem] font-bold text-[#d3dbe8]" htmlFor="auth-email">
              Correo electrónico
              <Input className="!h-[42px] !rounded-[7px] !border-[#354155] !bg-[#111722] !px-3 !py-[11px] !text-[#edf0f7] focus-visible:!border-[#8292ff] focus-visible:!ring-[3px] focus-visible:!ring-[rgba(119,137,255,0.16)]" id="auth-email" name="email" type="email" required autoComplete="email" />
            </Label>
            <Label className="grid gap-[7px] text-[0.84rem] font-bold text-[#d3dbe8]" htmlFor="auth-password">
              Contraseña
              <Input className="!h-[42px] !rounded-[7px] !border-[#354155] !bg-[#111722] !px-3 !py-[11px] !text-[#edf0f7] focus-visible:!border-[#8292ff] focus-visible:!ring-[3px] focus-visible:!ring-[rgba(119,137,255,0.16)]" id="auth-password" name="password" type="password" minLength={8} required autoComplete={isRegistering ? 'new-password' : 'current-password'} />
            </Label>
            {authMessage && <p className={`border-l-[3px] px-3 py-2.5 text-[0.84rem] ${authMessage.type === 'error' ? 'border-[#f06b84] bg-[#44242e] text-[#ffc0cc]' : 'border-[#52c79b] bg-[#173d33] text-[#b9f0d7]'}`}>{authMessage.text}</p>}
            <Button className="mt-1 h-10 w-full bg-[#7d8cff] px-4 font-extrabold text-[#101528] hover:bg-[#99a5ff]" type="submit">{isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}</Button>
          </form>
          <Button className="mx-auto mt-4 flex h-auto px-1.5 py-1.5 text-[#9facff] hover:bg-transparent hover:text-[#d5daff]" variant="ghost" type="button" onClick={() => { setIsRegistering((value) => !value); setAuthMessage(null) }}>{isRegistering ? 'Ya tengo una cuenta' : 'Quiero crear una cuenta'}</Button>
        </CardContent>
      </Card>
    </main>
  )
  if (showSettings) return <main className="app-shell"><header className="topbar"><div><p className="eyebrow">STUDYFLOW</p><h1>Configuración</h1></div><button className="text-button" type="button" onClick={() => setShowSettings(false)}>← Volver al tablero</button></header><section className="settings-card"><p className="eyebrow">CUENTA</p><h2>Tu cuenta</h2><p>{authSession.email}</p></section></main>

  return <main className="app-shell"><header className="topbar"><div><p className="eyebrow">TU ORGANIZADOR ACADÉMICO</p><h1>StudyFlow</h1></div><div className="header-actions"><span className="user-email">{authSession.email}</span><button className="text-button" type="button" onClick={() => setShowSettings(true)}>Configuración</button><button className="text-button" type="button" onClick={logout}>Cerrar sesión</button><button className="primary-button" type="button" onClick={() => setIsFormOpen(true)}>+ Nuevo elemento</button></div></header>{error && <p className="app-error">{error}</p>}<section className="welcome"><div><p className="day-label">TU ESPACIO DE ORGANIZACIÓN</p><h2>Tu tablero de estudio</h2><p>Tomá una tarjeta y llevala al siguiente estado.</p></div><div className="summary"><div><strong>{pendingCount}</strong><span>Pendientes</span></div><div><strong>{toSummarizeCount}</strong><span>Por resumir</span></div><div><strong>{readyToPrintCount}</strong><span>Para imprimir</span></div></div></section><section className="board-section"><div className="section-heading"><div><p className="eyebrow">ACTIVIDADES</p><h2>Mis tareas</h2></div><span className="section-note">Mantené y arrastrá entre columnas</span></div><Board columns={taskStatuses} items={tasks} itemType="task" draggedItem={draggedItem} dropTarget={dropTarget} onPointerDown={startPointerDrag} onPointerMove={movePointerDrag} onPointerUp={endPointerDrag} onDelete={setItemToDelete} /></section><section className="board-section materials-section"><div className="section-heading"><div><p className="eyebrow">MATERIAL DE ESTUDIO</p><h2>Resúmenes e impresiones</h2></div><span className="section-note">Mantené y arrastrá entre columnas</span></div><Board columns={materialStatuses} items={activeMaterials} itemType="material" draggedItem={draggedItem} dropTarget={dropTarget} onPointerDown={startPointerDrag} onPointerMove={movePointerDrag} onPointerUp={endPointerDrag} onArchive={archiveItem} onDelete={setItemToDelete} />{archivedPrinted.length > 0 && <div className="archive-area"><button className="archive-button" type="button" onClick={() => setShowArchived((current) => !current)}>{showArchived ? 'Ocultar impresos archivados' : `Ver impresos archivados (${archivedPrinted.length})`}</button><p>Se archivan automáticamente después de {archiveAfterDays} días o manualmente cuando lo decidas.</p>{showArchived && <Board columns={[{ value: 'printed', label: 'Impresos archivados', color: 'slate' }]} items={archivedPrinted} itemType="material" draggedItem={draggedItem} dropTarget={dropTarget} onPointerDown={startPointerDrag} onPointerMove={movePointerDrag} onPointerUp={endPointerDrag} onRestore={restoreItem} onDelete={setItemToDelete} />}</div>}</section>{draggedItem && createPortal(<div className="drag-overlay" ref={dragOverlayRef}><p>{draggedItem.subject}</p><strong>{draggedItem.title}</strong><span>Soltá para mover</span></div>, document.body)}{itemToDelete && <div className="modal-backdrop"><section className="creation-modal delete-modal"><p className="eyebrow">ELIMINAR ELEMENTO</p><h2>¿Eliminar “{itemToDelete.title}”?</h2><p className="delete-copy">Esta acción no se puede deshacer.</p><div className="form-actions"><button className="text-button" type="button" onClick={() => setItemToDelete(null)}>Cancelar</button><button className="danger-button" type="button" onClick={() => void deleteItem()}>Eliminar</button></div></section></div>}{isFormOpen && <div className="modal-backdrop"><section className="creation-modal"><button className="close-button" type="button" onClick={() => setIsFormOpen(false)}>×</button><p className="eyebrow">NUEVO ELEMENTO</p><h2>¿Qué querés agregar?</h2><form onSubmit={createItem}><label>Tipo de elemento<select value={itemType} onChange={(event) => changeItemType(event.target.value as ItemType)}><option value="task">Tarea</option><option value="material">Material de estudio</option></select></label><label>Estado<select value={itemStatus} onChange={(event) => setItemStatus(event.target.value as ItemStatus)}>{availableStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label><label>Título<input name="title" required autoFocus /></label><label>Materia<input name="subject" required /></label><div className="form-actions"><button className="text-button" type="button" onClick={() => setIsFormOpen(false)}>Cancelar</button><button className="primary-button" type="submit">Crear elemento</button></div></form></section></div>}</main>
}

export default App
