import type { ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { HTMLMotionProps } from 'motion/react'

const gentleEase = [0.22, 1, 0.36, 1] as const

export function AnimatedList({ children }: { children: ReactNode }) {
  return <AnimatePresence initial={false} mode="sync">{children}</AnimatePresence>
}

export function AnimatedListItem({
  children,
  className,
  interactive = true,
  isDragging = false,
}: {
  children: ReactNode
  className?: string
  interactive?: boolean
  isDragging?: boolean
}) {
  const reduceMotion = useReducedMotion()
  const canAnimateInteraction = !reduceMotion && interactive && !isDragging

  return (
    <motion.div
      className={className}
      layout={reduceMotion || isDragging ? false : 'position'}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.99, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.985, y: -4 }}
      whileHover={canAnimateInteraction ? { scale: 1.004, y: -2 } : undefined}
      whileTap={canAnimateInteraction ? { scale: 0.995 } : undefined}
      transition={reduceMotion ? { duration: 0 } : {
        duration: 0.18,
        ease: gentleEase,
        layout: { type: 'spring', stiffness: 420, damping: 38, mass: 0.7 },
      }}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedSection({ children, ...props }: HTMLMotionProps<'section'>) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.section
      {...props}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: gentleEase }}
    >
      {children}
    </motion.section>
  )
}