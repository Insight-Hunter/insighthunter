
import { Ai } from '@cloudflare/ai'
import type { Env } from '../types'

const SYSTEM_PROMPT = `You are an expert business analyst. Your responses are always concise, actionable, and formatted as requested.`

export class AISession {
  private state: DurableObjectState
  private env: Env

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
  }

  async fetch(request: Request) {
    // Handle history deletion
    if (request.method === 'DELETE') {
      await this.state.storage.deleteAll()
      return new Response(null, { status: 204 })
    }

    // For chat, we expect a POST with the user's message
    if (request.method !== 'POST') {
      return new Response('Invalid method', { status: 405 })
    }

    const { message } = await request.json<{ message: string }>()
    if (!message) {
      return new Response('Missing `message` in request body', { status: 400 })
    }

    const ai = new Ai(this.env.AI)
    const history: any[] = (await this.state.storage.get('history')) || []

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: message },
    ]

    const stream = await ai.run('@cf/meta/llama-3-8b-instruct', {
      messages,
      stream: true,
    })

    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    const decoder = new TextDecoder()
    let fullResponse = ''

    const processStream = async () => {
      const reader = stream.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            const finalHistory = [
              ...history,
              { role: 'user', content: message },
              { role: 'assistant', content: fullResponse },
            ]
            await this.state.storage.put('history', finalHistory)
            writer.close()
            break
          }
          fullResponse += decoder.decode(value, { stream: true })
          writer.write(value)
        }
      } catch (error) {
        console.error('Error processing stream:', error)
        writer.abort(error)
      }
    }

    processStream()

    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }
}
