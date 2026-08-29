import { useState } from 'react'
import { CalendarDays, Eye, GraduationCap, Trash2 } from 'lucide-react'
import { AnimatedList, AnimatedListItem, AnimatedSection } from '@/components/motion/MotionPrimitives'
import { AcademicItemDetailDialog, eventStyles, formatAcademicDate, getEventKind, getEventLabel } from '@/components/calendar/CalendarSection'
import type { CalendarStudyItem } from '@/components/calendar/CalendarSection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { StudyItem } from '@/types/api/studyItems'

type ActiveExam = CalendarStudyItem & { type: 'exam' }

function isActiveExam(item: StudyItem): item is ActiveExam {
  return item.type === 'exam'
    && !item.isArchived
    && !item.archivedManually
    && Boolean(item.dueDate)
}

export function ExamsSection({ items, onDelete }: { items: StudyItem[]; onDelete: (item: StudyItem) => void }) {
  const [selectedExam, setSelectedExam] = useState<ActiveExam | null>(null)
  const exams = items
    .filter(isActiveExam)
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate) || left.subject.localeCompare(right.subject, 'es'))

  return (
    <>
      <AnimatedSection className="flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border border-[#3a304d] bg-[radial-gradient(circle_at_top_right,rgba(104,72,145,0.14),transparent_34%),linear-gradient(145deg,#151927,#0d1421)] shadow-[0_22px_60px_rgba(2,6,23,0.24)] xl:h-[500px]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#322b45] bg-[#1a1d30]/82 p-4">
          <div className="flex items-start gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#614c82] bg-[#302443] text-[#d1afff] shadow-[0_9px_24px_rgba(66,39,104,0.25)]">
              <GraduationCap className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.66rem] font-bold tracking-[0.13em] text-[#9a82b9] uppercase">Evaluaciones</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
                <h2 className="text-[1.25rem] font-bold tracking-[-0.04em] text-[#edf2f8]">Exámenes</h2>
                <Badge className="h-6 min-w-6 rounded-full border-[#54436d] bg-[#2b223c] px-2 text-[0.7rem] font-bold text-[#ceb5ed]" variant="outline">{exams.length}</Badge>
              </div>
              <p className="mt-1 text-[0.74rem] text-[#82758f]">Próximas instancias ordenadas por fecha académica.</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {exams.length === 0 ? (
            <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-[#392f4b] bg-[#101522]/65 px-5 py-8 text-center text-[#776b84]">
              <GraduationCap className="mb-3 size-6" aria-hidden="true" />
              <strong className="text-[0.84rem] font-semibold text-[#a79ab5]">No hay exámenes activos</strong>
              <span className="mt-1 text-[0.72rem]">Los exámenes que agregues aparecerán aquí y en el calendario.</span>
            </div>
          ) : (
            <div className="grid gap-3 2xl:grid-cols-2">
              <AnimatedList>
              {exams.map((exam) => {
                const kind = getEventKind(exam)

                return (
                  <AnimatedListItem className="min-w-0" key={exam.id}>
                    <Card className="gap-0 overflow-hidden rounded-2xl border border-[#332c47] bg-[linear-gradient(145deg,#1a2030,#121825)] p-0 py-0 text-[#edf2fa] ring-0 shadow-[0_14px_34px_rgba(2,6,23,0.25)] transition-colors hover:border-[#4a3c62]" key={exam.id}>
                    <div className="p-4 pb-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-2.5">
                        <Badge className={['h-6 rounded-md px-2.5 text-[0.68rem] font-semibold', eventStyles[kind]].join(' ')} variant="outline">{getEventLabel(exam)}</Badge>
                        <span className="flex items-center gap-1.5 rounded-md border border-[#35435b] bg-[#152033] px-2 py-1 text-[0.66rem] font-semibold text-[#aebbd0]">
                          <CalendarDays className="size-3.5 text-[#8299c3]" aria-hidden="true" />
                          {formatAcademicDate(exam.dueDate)}
                        </span>
                      </div>

                      <h3 className="mt-4 text-[1rem] font-semibold tracking-[-0.02em] text-[#f1f4f9]">{exam.subject}</h3>
                      <p className={['mt-2 min-h-5 text-[0.75rem]', exam.examInstance ? 'text-[#a99bb8]' : 'text-[#5f6574]'].join(' ')}>{exam.examInstance || 'Sin detalle adicional'}</p>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-[#2e3043] bg-[#111725]/80 px-4 py-3">
                      <Button className="h-8 gap-1.5 rounded-lg border-[#3b4962] bg-[#19253a] px-3 text-[0.72rem] font-semibold text-[#b7c5d9] hover:bg-[#263650] hover:text-white" variant="outline" size="sm" type="button" onClick={() => setSelectedExam(exam)}>
                        <Eye className="size-3.5" aria-hidden="true" />
                        Ver detalle
                      </Button>
                      <Button className="size-8 rounded-lg border border-[#71303e] bg-[#351923] text-[#ff91a5] hover:border-[#a34255] hover:bg-[#57222f] hover:text-[#ffc0cb]" variant="destructive" size="icon-sm" type="button" aria-label={`Eliminar ${exam.title} de ${exam.subject}`} title="Eliminar" onClick={() => onDelete(exam)}>
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                    </Card>
                  </AnimatedListItem>
                )
              })}
              </AnimatedList>
            </div>
          )}
        </div>
      </AnimatedSection>

      <AcademicItemDetailDialog item={selectedExam} onClose={() => setSelectedExam(null)} />
    </>
  )
}