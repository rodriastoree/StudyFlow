import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, LoaderCircle, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ApiError } from '@/lib/api/httpClient'
import { confirmEmail } from '@/services/authService'

type ConfirmationState =
  | { status: 'confirming'; message: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

const initialParams = new URLSearchParams(window.location.search)
const initialUserId = initialParams.get('userId')
const initialToken = initialParams.get('token')
let confirmationRequest: ReturnType<typeof confirmEmail> | null = null

export function ConfirmEmailPage() {
  const [state, setState] = useState<ConfirmationState>({
    status: 'confirming',
    message: 'Confirmando...',
  })

  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname)

    if (!initialUserId || !initialToken) {
      setState({ status: 'error', message: 'El enlace de confirmación es inválido o está incompleto.' })
      return
    }

    confirmationRequest ??= confirmEmail({ userId: initialUserId, token: initialToken })
    void confirmationRequest
      .then((response) => {
        setState({ status: 'success', message: response.message })
      })
      .catch((error: unknown) => {
        const message = error instanceof ApiError || error instanceof Error
          ? error.message
          : 'El enlace de confirmación es inválido o expiró.'
        setState({ status: 'error', message })
      })
  }, [])

  const icon = state.status === 'confirming'
    ? <LoaderCircle className="size-8 animate-spin" aria-hidden="true" />
    : state.status === 'success'
      ? <CircleCheck className="size-8" aria-hidden="true" />
      : <CircleAlert className="size-8" aria-hidden="true" />

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-[480px] gap-0 rounded-[18px] border border-[#34405a] bg-[rgba(25,31,43,0.94)] py-0 text-[#edf0f7] shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-0">
        <CardHeader className="items-center gap-0 px-8 pt-8 pb-0 text-center">
          <span className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-[#465b94] bg-[#26365e] text-[#afbdff]">
            <MailCheck className="size-7" aria-hidden="true" />
          </span>
          <p className="mb-[9px] text-[0.72rem] font-[750] tracking-[0.1em] text-[#b7c2ff]">STUDYFLOW</p>
          <h1 className="text-[1.65rem] leading-tight tracking-[-0.05em]">Confirmación de correo</h1>
        </CardHeader>
        <CardContent className="px-8 pt-6 pb-8 text-center">
          <div
            className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-full ${state.status === 'success' ? 'bg-[#173d33] text-[#8ee2bd]' : state.status === 'error' ? 'bg-[#44242e] text-[#ffc0cc]' : 'bg-[#222e50] text-[#aebaff]'}`}
          >
            {icon}
          </div>
          <p className="leading-6 text-[#b5c0d1]" aria-live="polite">{state.message}</p>
          {state.status !== 'confirming' && (
            <Button
              className="mt-6 h-10 w-full bg-[#7d8cff] px-4 font-extrabold text-[#101528] hover:bg-[#99a5ff]"
              type="button"
              onClick={() => window.location.assign('/')}
            >
              Volver al inicio de sesión
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
