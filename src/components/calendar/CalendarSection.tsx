import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { StudyItem } from '@/types/api/studyItems'

export type CalendarStudyItem = StudyItem & { dueDate: string }
type CalendarEventKind = 'task' | 'practical-work' | 'partial' | 'final' | 'recovery'

const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const monthFormatter = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' })
const dateFormatter = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
export const eventStyles: Record<CalendarEventKind, string> = {
  task: 'border-[#365f91] bg-[#1b3454] text-[#a8ceff] hover:border-[#4e7cb3] hover:bg-[#24456d]',
  'practical-work': 'border-[#75612f] bg-[#382f1c] text-[#edcb77] hover:border-[#9a7d39] hover:bg-[#4a3c22]',
  partial: 'border-[#5d477f] bg-[#312447] text-[#d0aeff] hover:border-[#7b5da6] hover:bg-[#412f5c]',
  final: 'border-[#7a3f55] bg-[#3b202d] text-[#f4abc2] hover:border-[#a05470] hover:bg-[#522a3c]',
  recovery: 'border-[#286479] bg-[#163947] text-[#85deef] hover:border-[#35859f] hover:bg-[#1e4c5e]',
}

function isCalendarItem(item: StudyItem): item is CalendarStudyItem {
  if (item.isArchived || item.archivedManually || !item.dueDate) return false
  return item.type === 'task' || item.type === 'practical-work' || item.type === 'exam'
}

export function getEventKind(item: CalendarStudyItem): CalendarEventKind {
  if (item.type === 'task') return 'task'
  if (item.type === 'practical-work') return 'practical-work'
  return item.examType ?? 'partial'
}

export function getEventLabel(item: CalendarStudyItem) {
  const kind = getEventKind(item)
  return {
    task: 'Tarea',
    'practical-work': 'Trabajo práctico',
    partial: 'Parcial',
    final: 'Final',
    recovery: 'Recuperatorio',
  }[kind]
}

function getStatusLabel(item: CalendarStudyItem) {
  if (item.status === 'pending') return 'Pendiente'
  return item.type === 'practical-work' ? 'Completado' : 'Completada'
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMonthGrid(month: Date) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDay = new Date(year, monthIndex, 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cellCount = Math.ceil((mondayOffset + daysInMonth) / 7) * 7

  return Array.from({ length: cellCount }, (_, index) => (
    new Date(year, monthIndex, 1 - mondayOffset + index)
  ))
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatAcademicDate(value: string) {
  return capitalize(dateFormatter.format(parseDateOnly(value)))
}

export function AcademicItemDetailDialog({ item, onClose }: { item: CalendarStudyItem | null; onClose: () => void }) {
  return (
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      {item && (
        <DialogContent className="max-w-[460px] gap-0 rounded-2xl border border-[#34405a] bg-[#191f2b] p-7 text-[#edf0f7] shadow-[0_24px_80px_rgba(0,0,0,0.5)] ring-0 sm:max-w-[460px] [&_[data-slot=dialog-close]]:text-[#94a2b7] [&_[data-slot=dialog-close]]:hover:bg-[#263247] [&_[data-slot=dialog-close]]:hover:text-white">
          <DialogHeader className="gap-0">
            <Badge className={['mb-4 h-6 w-fit rounded-md px-2.5 text-[0.68rem] font-semibold', eventStyles[getEventKind(item)]].join(' ')} variant="outline">{getEventLabel(item)}</Badge>
            <DialogTitle className="text-[1.35rem] leading-tight font-bold tracking-[-0.04em] text-[#f1f4f9]">{item.title}</DialogTitle>
            <DialogDescription className="sr-only">Detalle del elemento académico seleccionado.</DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid gap-3">
            <div className="rounded-xl border border-[#2d3c54] bg-[#111a29] px-4 py-3">
              <span className="block text-[0.65rem] font-bold tracking-[0.1em] text-[#71839f] uppercase">Materia</span>
              <strong className="mt-1.5 block text-[0.86rem] font-semibold text-[#dce3ed]">{item.subject}</strong>
            </div>
            <div className="rounded-xl border border-[#2d3c54] bg-[#111a29] px-4 py-3">
              <span className="block text-[0.65rem] font-bold tracking-[0.1em] text-[#71839f] uppercase">Fecha</span>
              <strong className="mt-1.5 block text-[0.86rem] font-semibold text-[#dce3ed]">{formatAcademicDate(item.dueDate)}</strong>
            </div>
            {item.type === 'exam' ? (
              item.examInstance && (
                <div className="rounded-xl border border-[#2d3c54] bg-[#111a29] px-4 py-3">
                  <span className="block text-[0.65rem] font-bold tracking-[0.1em] text-[#71839f] uppercase">Instancia / detalle</span>
                  <strong className="mt-1.5 block text-[0.86rem] font-semibold text-[#dce3ed]">{item.examInstance}</strong>
                </div>
              )
            ) : (
              <div className="rounded-xl border border-[#2d3c54] bg-[#111a29] px-4 py-3">
                <span className="block text-[0.65rem] font-bold tracking-[0.1em] text-[#71839f] uppercase">Estado</span>
                <strong className="mt-1.5 block text-[0.86rem] font-semibold text-[#dce3ed]">{getStatusLabel(item)}</strong>
              </div>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}

export function CalendarSection({ items }: { items: StudyItem[] }) {
  const [displayedMonth, setDisplayedMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [selectedItem, setSelectedItem] = useState<CalendarStudyItem | null>(null)

  const calendarItems = items.filter(isCalendarItem)
  const eventsByDate = new Map<string, CalendarStudyItem[]>()

  for (const item of calendarItems) {
    const events = eventsByDate.get(item.dueDate) ?? []
    events.push(item)
    eventsByDate.set(item.dueDate, events)
  }

  const monthDays = getMonthGrid(displayedMonth)
  const todayKey = toDateKey(new Date())
  const monthLabel = capitalize(monthFormatter.format(displayedMonth))
  const changeMonth = (offset: number) => setDisplayedMonth((current) => (
    new Date(current.getFullYear(), current.getMonth() + offset, 1)
  ))
  const goToToday = () => {
    const today = new Date()
    setDisplayedMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  return (
    <>
      <section className="flex h-full flex-col overflow-hidden rounded-[26px] border border-[#253750] bg-[linear-gradient(145deg,#101b2d,#0c1523)] shadow-[0_22px_60px_rgba(2,6,23,0.24)] xl:h-[500px]">
        <div className="flex flex-col gap-3 border-b border-[#26384f] bg-[#132037]/82 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#405b8d] bg-[#1c3153] text-[#9bb8ff] shadow-[0_9px_24px_rgba(24,49,102,0.28)]">
              <CalendarDays className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.66rem] font-bold tracking-[0.13em] text-[#7e92b5] uppercase">Agenda académica</p>
              <h2 className="mt-0.5 text-[1.25rem] font-bold tracking-[-0.04em] text-[#edf2f8]">Calendario</h2>
              <p className="mt-1 text-[0.74rem] text-[#7888a1]">Fechas de tareas, trabajos prácticos y exámenes activos.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button className="size-8 rounded-lg border-[#344865] bg-[#18263c] text-[#aebbd0] hover:bg-[#243650] hover:text-white" variant="outline" size="icon" type="button" aria-label="Mes anterior" title="Mes anterior" onClick={() => changeMonth(-1)}>
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <div className="min-w-36 rounded-lg border border-[#30425f] bg-[#0d1727] px-3 py-1.5 text-center text-[0.78rem] font-semibold text-[#dbe3ef]">
              {monthLabel}
            </div>
            <Button className="size-8 rounded-lg border-[#344865] bg-[#18263c] text-[#aebbd0] hover:bg-[#243650] hover:text-white" variant="outline" size="icon" type="button" aria-label="Mes siguiente" title="Mes siguiente" onClick={() => changeMonth(1)}>
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
            <Button className="h-8 rounded-lg border-[#405988] bg-[#1b3154] px-3 text-[0.72rem] font-semibold text-[#bed0ff] hover:bg-[#284472] hover:text-white" variant="outline" type="button" onClick={goToToday}>Hoy</Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-2.5 sm:p-3">
          <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[#2a3b55] bg-[#0c1625]">
            <div className="grid grid-cols-7 border-b border-[#2a3b55] bg-[#17243a]">
              {weekDays.map((day) => (
                <div className="border-r border-[#2a3b55] px-1 py-1.5 text-center text-[0.56rem] font-bold tracking-[0.08em] text-[#8192ad] uppercase last:border-r-0 sm:px-2 sm:text-[0.64rem] sm:tracking-[0.1em]" key={day}>{day}</div>
              ))}
            </div>

            <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7">
              {monthDays.map((day) => {
                const dateKey = toDateKey(day)
                const dayEvents = eventsByDate.get(dateKey) ?? []
                const visibleEvents = dayEvents.slice(0, 1)
                const remainingEvents = dayEvents.length - visibleEvents.length
                const belongsToMonth = day.getMonth() === displayedMonth.getMonth()
                const isToday = dateKey === todayKey

                return (
                  <div className={['min-h-16 min-w-0 overflow-hidden border-r border-b border-[#26364d] p-1 last:border-r-0 sm:min-h-20 sm:p-1.5 xl:min-h-0', belongsToMonth ? 'bg-[#101a2a]' : 'bg-[#0b1421] text-[#4e5d72] opacity-55'].join(' ')} key={dateKey}>
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <time className={['flex size-6 items-center justify-center rounded-full text-[0.68rem] font-semibold', isToday ? 'bg-[#5b78df] text-white shadow-[0_0_0_2px_rgba(91,120,223,0.18)]' : belongsToMonth ? 'text-[#b9c4d5]' : 'text-[#526177]'].join(' ')} dateTime={dateKey}>{day.getDate()}</time>
                      {remainingEvents > 0 && <span className="truncate text-[0.56rem] font-semibold text-[#8192ad]">+{remainingEvents} más</span>}
                    </div>

                    <div className="grid gap-1">
                      {visibleEvents.map((item) => {
                        const kind = getEventKind(item)
                        return (
                          <Button className={['h-6 w-full min-w-0 flex-row items-center justify-start gap-1 overflow-hidden rounded-md border px-1.5 py-0.5 text-left shadow-none', eventStyles[kind]].join(' ')} variant="ghost" type="button" key={item.id} title={`${getEventLabel(item)}: ${item.title}`} onClick={() => setSelectedItem(item)}>
                            <span className="shrink-0 text-[0.5rem] font-extrabold tracking-[0.04em] uppercase opacity-80">{getEventLabel(item)}</span>
                            <span className="min-w-0 flex-1 truncate text-[0.6rem] font-semibold">{item.type === 'exam' ? item.subject : item.title}</span>
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <AcademicItemDetailDialog item={selectedItem} onClose={() => setSelectedItem(null)} />
    </>
  )
}