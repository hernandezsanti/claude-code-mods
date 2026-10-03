const SOUNDS = '/System/Library/Sounds'

// Un turno más corto que esto lo estás mirando: sonar sería ruido.
export const MIN_SECONDS = 20

export type Turn = { durationMs: number; isAborted: boolean; answer: string; agentId?: string }

// Qué sonido corresponde a un turno que acaba de terminar, o null si ninguno.
// Pregunta (termina en "?"): Ping, espera tu respuesta. Resto: Glass, terminó.
export function soundFor(turn: Turn): string | null {
  if (turn.agentId !== undefined || turn.isAborted) return null
  if (turn.durationMs < MIN_SECONDS * 1000) return null

  const isQuestion = /\?\s*$/.test(turn.answer.trim())
  return `${SOUNDS}/${isQuestion ? 'Ping' : 'Glass'}.aiff`
}
