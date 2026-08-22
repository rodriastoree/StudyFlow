import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Archive, BookOpen, CalendarDays, Clock3, Eye, EyeOff, GripVertical, Inbox, LayoutDashboard, LogOut, Plus, Printer, RotateCcw, Settings, Trash2, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
const materialStatuses = [{ value: 'to-summarize', label: 'Por resumir', color: 'violet' }, { value: 'summarized', label: 'Resumido', color: 'blue' }, { value: 'printed', label: 'Para imprimir', color: 'slate' }] as const
const itemTypeLabels: Record<ItemType, string> = { task: 'Tarea', material: 'Material' }
const itemStatusLabels: Record<ItemStatus, string> = { pending: 'Pendiente', completed: 'Completada', 'to-summarize': 'Para resumir', summarized: 'Resumido', printed: 'Impreso' }
const typeBadgeClasses: Record<ItemType, string> = {
  task: 'border-[#365f91] bg-[#1d3555] text-[#91c2ff]',
  material: 'border-[#594278] bg-[#302447] text-[#c7a3ff]',
}
const statusDotClasses: Record<string, string> = {
  amber: 'bg-[#f0b54b] shadow-[0_0_9px_rgba(240,181,75,0.4)]',
  green: 'bg-[#4fc997] shadow-[0_0_9px_rgba(79,201,151,0.35)]',
  violet: 'bg-[#b68cff] shadow-[0_0_9px_rgba(182,140,255,0.4)]',
  blue: 'bg-[#77a2ff] shadow-[0_0_9px_rgba(119,162,255,0.4)]',
  slate: 'bg-[#778397]',
}
const statusBadgeClasses: Record<ItemStatus, string> = {
  pending: 'border-[#62502c] bg-[#342c1d] text-[#f3ca73]',
  completed: 'border-[#285744] bg-[#18362d] text-[#82dfba]',
  'to-summarize': 'border-[#51426d] bg-[#2c2540] text-[#c8a8ff]',
  summarized: 'border-[#344f78] bg-[#1e304d] text-[#91b8ff]',
  printed: 'border-[#286479] bg-[#163947] text-[#77d9f2]',
}
const studyItemDateFormatter = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })

function Board({ columns, items, itemType, draggedItem, dropTarget, onPointerDown, onPointerMove, onPointerUp, onArchive, onRestore, onDelete }: { columns: readonly StatusColumn[]; items: StudyItem[]; itemType: ItemType; draggedItem: StudyItem | null; dropTarget: ItemStatus | null; onPointerDown: (event: PointerEvent<HTMLElement>, item: StudyItem) => void; onPointerMove: (event: PointerEvent<HTMLElement>) => void; onPointerUp: (event: PointerEvent<HTMLElement>) => void; onArchive?: (id: string) => void; onRestore?: (id: string) => void; onDelete: (item: StudyItem) => void }) {
  return (
    <div className={columns.length === 3 ? 'grid gap-5 lg:grid-cols-3' : columns.length === 2 ? 'grid gap-5 md:grid-cols-2' : 'grid gap-5'}>
      {columns.map((column) => {
        const columnItems = items.filter((item) => item.status === column.value)
        const isDropTarget = dropTarget === column.value && draggedItem?.type === itemType

        return (
          <section
            className={[
              'relative min-h-[330px] overflow-hidden rounded-2xl border p-3.5 shadow-[0_18px_45px_rgba(2,6,23,0.18)] transition-all duration-200',
              isDropTarget
                ? '-translate-y-1 border-[#6785ff] bg-[#182544] ring-2 ring-[#6785ff]/30 shadow-[0_24px_60px_rgba(28,52,120,0.28)]'
                : 'border-[#26354d] bg-[linear-gradient(180deg,rgba(20,30,48,0.96),rgba(13,21,35,0.98))] hover:border-[#344763]',
            ].join(' ')}
            data-drop-status={column.value}
            data-drop-type={itemType}
            key={column.value}
          >
            <div className="flex items-center gap-3 rounded-xl border border-[#2a3a54] bg-[#18243a]/90 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
              <span className={['size-2.5 shrink-0 rounded-full', statusDotClasses[column.color] ?? statusDotClasses.slate].join(' ')} />
              <h3 className="flex-1 text-[0.9rem] font-semibold tracking-[-0.01em] text-[#e4eaf4]">{column.label}</h3>
              <Badge className="h-6 min-w-6 rounded-full border border-[#3b4b65] bg-[#22304a] px-2 text-[0.72rem] font-bold text-[#c4cee0]" variant="outline">{columnItems.length}</Badge>
            </div>

            <div className="mt-3 grid min-h-[248px] content-start gap-3 rounded-xl border border-dashed border-[#273750] bg-[#0b1423]/55 p-2.5">
              {columnItems.length === 0 ? (
                <div className={['flex min-h-[210px] flex-col items-center justify-center rounded-lg border px-5 text-center transition-colors', isDropTarget ? 'border-[#6580ee]/70 bg-[#1b2a50]/80 text-[#d2dcff]' : 'border-transparent text-[#71809a]'].join(' ')}>
                  <span className="mb-3 flex size-10 items-center justify-center rounded-xl border border-[#2d3e59] bg-[#162238]">
                    <Inbox className="size-4.5" aria-hidden="true" />
                  </span>
                  <strong className="text-[0.82rem] font-semibold">{isDropTarget ? 'Soltá el elemento aquí' : 'Sin elementos'}</strong>
                  <span className="mt-1 text-[0.72rem] text-[#687790]">{isDropTarget ? 'Se guardará en esta columna.' : 'Arrastrá una tarjeta para moverla.'}</span>
                </div>
              ) : columnItems.map((item) => (
                <Card
                  className={[
                    'touch-none cursor-grab select-none gap-0 overflow-hidden rounded-xl border border-[#2b3b54] bg-[linear-gradient(145deg,#172338,#111a2a)] p-0 py-0 text-[#edf2fa] ring-0 shadow-[0_10px_28px_rgba(2,6,23,0.26)] transition-all duration-200 active:cursor-grabbing',
                    draggedItem?.id === item.id
                      ? 'scale-[0.97] cursor-grabbing border-[#7187d9] opacity-35'
                      : 'hover:-translate-y-0.5 hover:border-[#435b7c] hover:shadow-[0_16px_36px_rgba(2,6,23,0.38)]',
                  ].join(' ')}
                  key={item.id}
                  onPointerDown={(event) => onPointerDown(event, item)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                >
                  <div className="p-4 pb-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[0.67rem] font-bold tracking-[0.11em] text-[#8fa5cd] uppercase">{item.subject}</p>
                        <h4 className="mt-2 text-[0.98rem] leading-snug font-semibold tracking-[-0.02em] text-[#f2f5fa]">{item.title}</h4>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button className="size-7 rounded-lg border border-[#71303e] bg-[#351923] text-[#ff91a5] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] hover:border-[#a34255] hover:bg-[#57222f] hover:text-[#ffc0cb]" variant="destructive" size="icon-sm" type="button" aria-label={'Eliminar ' + item.title} title="Eliminar" onPointerDown={(event) => event.stopPropagation()} onClick={() => onDelete(item)}>
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </Button>
                        <span className="flex size-8 items-center justify-center rounded-lg text-[#60718c]" title="Arrastrar">
                          <GripVertical className="size-4" aria-hidden="true" />
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className={['h-6 rounded-md px-2.5 text-[0.7rem] font-semibold', typeBadgeClasses[item.type]].join(' ')} variant="outline">{itemTypeLabels[item.type]}</Badge>
                      <Badge className={['h-6 rounded-md px-2.5 text-[0.7rem] font-semibold', statusBadgeClasses[item.status]].join(' ')} variant="outline">{itemStatusLabels[item.status]}</Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#293851] bg-[#101a2a]/80 px-4 py-3">
                    <time className="flex items-center gap-1.5 text-[0.7rem] text-[#8291a8]" dateTime={item.createdAt}>
                      <CalendarDays className="size-3.5" aria-hidden="true" />
                      {studyItemDateFormatter.format(new Date(item.createdAt))}
                    </time>
                    {item.type === 'material' && item.status === 'printed' && onArchive && (
                      <Button className="h-7 gap-1.5 rounded-md border-[#3c4e6d] bg-[#1d2b43] px-2.5 text-[0.7rem] font-semibold text-[#c0cdf0] hover:bg-[#293a58] hover:text-white" variant="outline" size="sm" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onArchive(item.id)}>
                        <Archive className="size-3.5" aria-hidden="true" />
                        Archivar
                      </Button>
                    )}
                    {onRestore && (
                      <Button className="h-7 gap-1.5 rounded-md border-[#3c4e6d] bg-[#1d2b43] px-2.5 text-[0.7rem] font-semibold text-[#c0cdf0] hover:bg-[#293a58] hover:text-white" variant="outline" size="sm" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onRestore(item.id)}>
                        <RotateCcw className="size-3.5" aria-hidden="true" />
                        Mostrar últimos 30 días
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
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

  const deleteDialog = (
    <Dialog open={itemToDelete !== null} onOpenChange={(open) => { if (!open) setItemToDelete(null) }}>
      {itemToDelete && (
        <DialogContent className="max-w-[410px] gap-0 rounded-2xl border border-[#34405a] bg-[#191f2b] p-7 text-[#edf0f7] shadow-[0_24px_80px_rgba(0,0,0,0.5)] ring-0 sm:max-w-[410px]" showCloseButton={false}>
          <DialogHeader className="gap-0">
            <p className="mb-2 text-[0.72rem] font-[750] tracking-[0.1em] text-[#aebaff]">ELIMINAR ELEMENTO</p>
            <DialogTitle className="text-[1.25rem] leading-[1.3] font-bold tracking-[-0.04em]">¿Eliminar “{itemToDelete.title}”?</DialogTitle>
            <DialogDescription className="mt-3 text-[0.86rem] text-[#9facbe]">Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 -mb-0 mt-6 flex-row justify-end gap-2.5 border-0 bg-transparent p-0">
            <Button className="h-auto px-1.5 py-1.5 text-[#9facff] hover:bg-transparent hover:text-[#d5daff]" variant="ghost" type="button" onClick={() => setItemToDelete(null)}>Cancelar</Button>
            <Button className="h-auto bg-[#db526a] px-[15px] py-2.5 font-extrabold text-[#251017] hover:bg-[#f16c83]" variant="destructive" type="button" onClick={() => void deleteItem()}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )

  const studyItemDialog = (
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
      <DialogContent className="max-w-[470px] gap-0 rounded-2xl border border-[#34405a] bg-[#191f2b] p-7 text-[#edf0f7] shadow-[0_24px_80px_rgba(0,0,0,0.5)] ring-0 sm:max-w-[470px]">
        <DialogHeader className="gap-0">
          <p className="mb-2 text-[0.72rem] font-[750] tracking-[0.1em] text-[#aebaff]">NUEVO ELEMENTO</p>
          <DialogTitle className="text-[1.35rem] leading-tight font-bold tracking-[-0.04em]">¿Qué querés agregar?</DialogTitle>
          <DialogDescription className="sr-only">Completá los datos para crear un nuevo elemento de estudio.</DialogDescription>
        </DialogHeader>
        <form className="mt-6 grid gap-[17px]" onSubmit={createItem}>
          <Label className="grid gap-[7px] text-[0.84rem] font-bold text-[#c9d2df]" htmlFor="study-item-type">
            Tipo de elemento
            <Select items={itemTypeLabels} value={itemType} onValueChange={(value) => changeItemType(value as ItemType)}>
              <SelectTrigger className="!h-[42px] w-full !rounded-[7px] !border-[#354155] !bg-[#111722] !px-3 !py-[11px] !text-[#edf0f7] focus-visible:!border-[#8292ff] focus-visible:!ring-[3px] focus-visible:!ring-[rgba(119,137,255,0.16)]" id="study-item-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border border-[#46536b] bg-[#252d3c] text-[#d8dfeb] ring-0">
                <SelectItem className="focus:bg-[#35425a] focus:text-[#edf0f7]" value="task">{itemTypeLabels.task}</SelectItem>
                <SelectItem className="focus:bg-[#35425a] focus:text-[#edf0f7]" value="material">{itemTypeLabels.material}</SelectItem>
              </SelectContent>
            </Select>
          </Label>
          <Label className="grid gap-[7px] text-[0.84rem] font-bold text-[#c9d2df]" htmlFor="study-item-status">
            Estado
            <Select items={itemStatusLabels} value={itemStatus} onValueChange={(value) => setItemStatus(value as ItemStatus)}>
              <SelectTrigger className="!h-[42px] w-full !rounded-[7px] !border-[#354155] !bg-[#111722] !px-3 !py-[11px] !text-[#edf0f7] focus-visible:!border-[#8292ff] focus-visible:!ring-[3px] focus-visible:!ring-[rgba(119,137,255,0.16)]" id="study-item-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border border-[#46536b] bg-[#252d3c] text-[#d8dfeb] ring-0">
                {availableStatuses.map((status) => <SelectItem className="focus:bg-[#35425a] focus:text-[#edf0f7]" key={status.value} value={status.value}>{itemStatusLabels[status.value]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Label>
          <Label className="grid gap-[7px] text-[0.84rem] font-bold text-[#c9d2df]" htmlFor="study-item-title">
            Título
            <Input className="!h-[42px] !rounded-[7px] !border-[#354155] !bg-[#111722] !px-3 !py-[11px] !text-[#edf0f7] focus-visible:!border-[#8292ff] focus-visible:!ring-[3px] focus-visible:!ring-[rgba(119,137,255,0.16)]" id="study-item-title" name="title" required autoFocus />
          </Label>
          <Label className="grid gap-[7px] text-[0.84rem] font-bold text-[#c9d2df]" htmlFor="study-item-subject">
            Materia
            <Input className="!h-[42px] !rounded-[7px] !border-[#354155] !bg-[#111722] !px-3 !py-[11px] !text-[#edf0f7] focus-visible:!border-[#8292ff] focus-visible:!ring-[3px] focus-visible:!ring-[rgba(119,137,255,0.16)]" id="study-item-subject" name="subject" required />
          </Label>
          <DialogFooter className="mx-0 -mb-0 mt-[5px] flex-row justify-end gap-2.5 border-0 bg-transparent p-0">
            <Button className="h-auto px-1.5 py-1.5 text-[#9facff] hover:bg-transparent hover:text-[#d5daff]" variant="ghost" type="button" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
            <Button className="h-auto bg-[#7789ff] px-4 py-[11px] font-bold text-[#101429] shadow-[0_8px_20px_rgba(119,137,255,0.23)] hover:bg-[#a3afff]" type="submit">Crear elemento</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
  return (
    <main className="dark relative isolate mx-auto w-[min(1280px,calc(100%_-_48px))] pt-7 pb-20 max-[760px]:w-[min(100%_-_28px,620px)] max-[760px]:pt-4">
      <div className="pointer-events-none absolute -inset-x-12 -top-32 -z-10 h-[580px] bg-[radial-gradient(circle_at_18%_20%,rgba(48,74,142,0.2),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(38,93,112,0.14),transparent_28%)]" />

      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#273750] bg-[#101a2b]/95 px-4 py-3.5 shadow-[0_18px_48px_rgba(2,6,23,0.26),inset_0_1px_0_rgba(255,255,255,0.025)] backdrop-blur-xl sm:px-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#4662a0] bg-[linear-gradient(145deg,#38558f,#243961)] text-[#dbe6ff] shadow-[0_8px_22px_rgba(34,61,124,0.34)]">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[1.35rem] font-bold tracking-[-0.045em] text-[#f3f6fb]">StudyFlow</h1>
              <Badge className="h-6 rounded-md border-[#3b4c68] bg-[#1c2940] px-2.5 text-[0.69rem] font-semibold text-[#afbdd3]" variant="outline">{items.length} {items.length === 1 ? 'elemento' : 'elementos'}</Badge>
            </div>
            <p className="mt-0.5 truncate text-[0.72rem] text-[#70809a]">Organizador académico</p>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5 max-[900px]:basis-full max-[900px]:justify-start">
          <div className="mr-1 flex min-w-0 items-center gap-2 rounded-lg border border-[#293a54] bg-[#0c1524] px-3 py-2 text-[0.76rem] text-[#9dadc5]">
            <UserRound className="size-3.5 shrink-0 text-[#7488ab]" aria-hidden="true" />
            <span className="max-w-[210px] truncate">{authSession.email}</span>
          </div>
          <Button className="h-9 gap-2 rounded-lg border-[#30425f] bg-[#17243a] px-3 text-[0.76rem] font-semibold text-[#b4c1d5] hover:bg-[#21314b] hover:text-[#f1f5fb]" variant="outline" type="button" onClick={() => setShowSettings(true)}>
            <Settings className="size-3.5" aria-hidden="true" />
            Configuración
          </Button>
          <Button className="h-9 gap-2 rounded-lg px-3 text-[0.76rem] font-semibold text-[#92a3bc] hover:bg-[#202d42] hover:text-[#edf2f9]" variant="ghost" type="button" onClick={logout}>
            <LogOut className="size-3.5" aria-hidden="true" />
            Cerrar sesión
          </Button>
          <Button className="h-9 gap-2 rounded-lg bg-[#5574df] px-3.5 text-[0.78rem] font-bold text-white shadow-[0_8px_22px_rgba(57,87,181,0.3)] hover:-translate-y-px hover:bg-[#6785ed]" type="button" onClick={() => setIsFormOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo elemento
          </Button>
        </div>
      </header>

      {error && <p className="app-error">{error}</p>}

      <section className="relative mt-7 overflow-hidden rounded-[26px] border border-[#2b3d5b] bg-[radial-gradient(circle_at_top_right,rgba(65,95,173,0.2),transparent_38%),linear-gradient(135deg,#15223a,#101a2c_58%,#0d1d2b)] shadow-[0_24px_70px_rgba(2,6,23,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.05fr_1.65fr] lg:items-center">
          <div>
            <span className="mb-5 flex size-12 items-center justify-center rounded-2xl border border-[#3f5785] bg-[#1e3152] text-[#9eb6ff] shadow-[0_10px_28px_rgba(24,49,102,0.35)]">
              <LayoutDashboard className="size-5.5" aria-hidden="true" />
            </span>
            <p className="text-[0.68rem] font-bold tracking-[0.14em] text-[#7f94bb] uppercase">Vista general</p>
            <h2 className="mt-2 text-[clamp(1.7rem,3vw,2.25rem)] font-bold tracking-[-0.055em] text-[#f4f7fb]">Tu tablero de estudio</h2>
            <p className="mt-3 max-w-md text-[0.88rem] leading-6 text-[#91a0b8]">Organizá tus pendientes y materiales en un flujo claro. Arrastrá cada tarjeta para avanzar al siguiente estado.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="gap-0 rounded-2xl border border-[#4b422d] bg-[#211e1b]/85 p-4 py-4 text-[#edf2fa] ring-0 shadow-[0_14px_34px_rgba(2,6,23,0.2)]">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl border border-[#5f5130] bg-[#30291d] text-[#efbd5d]"><Clock3 className="size-4" aria-hidden="true" /></span>
                <strong className="text-3xl font-bold tracking-[-0.05em] text-[#f4c76f]">{pendingCount}</strong>
              </div>
              <span className="mt-5 text-[0.76rem] font-semibold text-[#c2b796]">Pendientes</span>
              <span className="mt-1 text-[0.68rem] text-[#7f796c]">Tareas por completar</span>
            </Card>
            <Card className="gap-0 rounded-2xl border border-[#493c61] bg-[#201d2e]/85 p-4 py-4 text-[#edf2fa] ring-0 shadow-[0_14px_34px_rgba(2,6,23,0.2)]">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl border border-[#574870] bg-[#2c2540] text-[#c5a5ff]"><BookOpen className="size-4" aria-hidden="true" /></span>
                <strong className="text-3xl font-bold tracking-[-0.05em] text-[#c5a5ff]">{toSummarizeCount}</strong>
              </div>
              <span className="mt-5 text-[0.76rem] font-semibold text-[#bab0ce]">Por resumir</span>
              <span className="mt-1 text-[0.68rem] text-[#797184]">Materiales pendientes</span>
            </Card>
            <Card className="gap-0 rounded-2xl border border-[#314e65] bg-[#172530]/85 p-4 py-4 text-[#edf2fa] ring-0 shadow-[0_14px_34px_rgba(2,6,23,0.2)]">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl border border-[#3b5d76] bg-[#1c3140] text-[#7ec5ed]"><Printer className="size-4" aria-hidden="true" /></span>
                <strong className="text-3xl font-bold tracking-[-0.05em] text-[#81c7ed]">{readyToPrintCount}</strong>
              </div>
              <span className="mt-5 text-[0.76rem] font-semibold text-[#a8bfce]">Para imprimir</span>
              <span className="mt-1 text-[0.68rem] text-[#6f818d]">Resúmenes listos</span>
            </Card>
          </div>
        </div>
      </section>

      <section className="mt-7 rounded-[26px] border border-[#202e44] bg-[#0d1625]/88 p-4 shadow-[0_22px_60px_rgba(2,6,23,0.22)] sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 px-1">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-[#594c2f] bg-[#2a251c] text-[#e8b95d]">
              <Clock3 className="size-4.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.66rem] font-bold tracking-[0.13em] text-[#7788a3] uppercase">Actividades</p>
              <h2 className="mt-1 text-[1.35rem] font-bold tracking-[-0.04em] text-[#edf2f8]">Mis tareas</h2>
            </div>
          </div>
          <Badge className="h-7 rounded-lg border-[#30425f] bg-[#152238] px-3 text-[0.7rem] font-medium text-[#8798b4]" variant="outline">Arrastrá para cambiar el estado</Badge>
        </div>
        <Board columns={taskStatuses} items={tasks} itemType="task" draggedItem={draggedItem} dropTarget={dropTarget} onPointerDown={startPointerDrag} onPointerMove={movePointerDrag} onPointerUp={endPointerDrag} onDelete={setItemToDelete} />
      </section>

      <section className="mt-7 rounded-[26px] border border-[#202e44] bg-[#0d1625]/88 p-4 shadow-[0_22px_60px_rgba(2,6,23,0.22)] sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 px-1">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-[#443b62] bg-[#252039] text-[#bca0f0]">
              <BookOpen className="size-4.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.66rem] font-bold tracking-[0.13em] text-[#7788a3] uppercase">Biblioteca</p>
              <h2 className="mt-1 text-[1.35rem] font-bold tracking-[-0.04em] text-[#edf2f8]">Material de estudio</h2>
            </div>
          </div>
          <Badge className="h-7 rounded-lg border-[#30425f] bg-[#152238] px-3 text-[0.7rem] font-medium text-[#8798b4]" variant="outline">Arrastrá para cambiar el estado</Badge>
        </div>
        <Board columns={materialStatuses} items={activeMaterials} itemType="material" draggedItem={draggedItem} dropTarget={dropTarget} onPointerDown={startPointerDrag} onPointerMove={movePointerDrag} onPointerUp={endPointerDrag} onArchive={archiveItem} onDelete={setItemToDelete} />
      </section>

      <section className="mt-7 overflow-hidden rounded-[26px] border border-[#26364e] bg-[linear-gradient(145deg,#111c2d,#0c1523)] shadow-[0_22px_60px_rgba(2,6,23,0.24)]">
        <div className="flex flex-col items-start justify-between gap-5 border-b border-[#26364d] bg-[#142035]/75 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex items-start gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#3b4c67] bg-[#1c2940] text-[#9aabc4]">
              <Archive className="size-4.5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-[1.35rem] font-bold tracking-[-0.04em] text-[#edf2f8]">Archivados</h2>
                <Badge className="h-6 min-w-6 rounded-full border-[#3b4c65] bg-[#22304a] px-2 text-[0.7rem] font-bold text-[#bdc8da]" variant="outline">{archivedPrinted.length}</Badge>
              </div>
              <p className="mt-2 max-w-2xl text-[0.77rem] leading-relaxed text-[#7888a1]">Los materiales impresos se archivan después de {archiveAfterDays} días o manualmente cuando lo decidas.</p>
            </div>
          </div>
          {archivedPrinted.length > 0 && (
            <Button className="h-9 gap-2 rounded-lg border-[#3b4d69] bg-[#1b2940] px-3 text-[0.74rem] font-semibold text-[#b5c2d5] hover:bg-[#263850] hover:text-white" variant="outline" type="button" onClick={() => setShowArchived((current) => !current)}>
              {showArchived ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              {showArchived ? 'Ocultar archivados' : 'Mostrar archivados'}
            </Button>
          )}
        </div>
        <div className="p-4 sm:p-6">
          {archivedPrinted.length === 0 ? (
            <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-[#2a3a52] bg-[#0b1421]/55 px-5 py-8 text-center text-[#74839a]">
              <Archive className="mb-3 size-5" aria-hidden="true" />
              <strong className="text-[0.82rem] font-semibold text-[#93a1b5]">Todavía no hay elementos archivados</strong>
              <span className="mt-1 text-[0.72rem]">Cuando archives un material, aparecerá en esta sección.</span>
            </div>
          ) : showArchived ? (
            <Board columns={[{ value: 'printed', label: 'Archivados', color: 'slate' }]} items={archivedPrinted} itemType="material" draggedItem={draggedItem} dropTarget={dropTarget} onPointerDown={startPointerDrag} onPointerMove={movePointerDrag} onPointerUp={endPointerDrag} onRestore={restoreItem} onDelete={setItemToDelete} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#293a54] bg-[#0d1727] px-4 py-4">
              <p className="text-[0.78rem] text-[#8493a9]">Hay {archivedPrinted.length} elementos archivados disponibles.</p>
              <span className="text-[0.7rem] text-[#60718a]">Usá “Mostrar archivados” para revisarlos.</span>
            </div>
          )}
        </div>
      </section>

      {draggedItem && createPortal(
        <div className="pointer-events-none fixed z-30 min-w-[240px] -translate-x-1/2 -translate-y-1/2 scale-[1.03] rounded-xl border border-[#7891ed] bg-[linear-gradient(145deg,#233453,#16253c)] px-4 py-3.5 text-[#f0f5fc] shadow-[0_24px_60px_rgba(2,6,23,0.58),0_0_0_1px_rgba(132,154,239,0.18)]" ref={dragOverlayRef}>
          <p className="mb-1.5 text-[0.66rem] font-bold tracking-[0.11em] text-[#aebeff] uppercase">{draggedItem.subject}</p>
          <strong className="block text-[0.92rem]">{draggedItem.title}</strong>
          <span className="mt-2 block text-[0.7rem] text-[#899ab5]">Soltá para mover</span>
        </div>,
        document.body,
      )}
      {deleteDialog}
      {studyItemDialog}
    </main>
  )
}

export default App
