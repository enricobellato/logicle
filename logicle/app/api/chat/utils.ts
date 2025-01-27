import { MessageDTO, Role } from '@/types/chat'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { saveMessage } from 'models/message'

export const createResponse = (
  userMessage: MessageDTO,
  stream: ReadableStream<string>,
  saveWhenDone: boolean = true
) => {
  // this is what we will write to db and send to the client
  const assistantMessage: MessageDTO = {
    id: nanoid(),
    role: 'assistant',
    content: '',
    attachments: [],
    conversationId: userMessage.conversationId,
    parent: userMessage.id,
    sentAt: new Date().toISOString(),
  }
  const responseStream = new ReadableStream<string>({
    async start(controller) {
      let downStreamError = false
      try {
        const msg = {
          type: 'response',
          content: assistantMessage,
        }
        controller.enqueue(`data: ${JSON.stringify(msg)} \n\n`)

        const reader = stream.getReader()
        for (;;) {
          const result = await reader.read()
          if (result.done) {
            break
          }
          const msg = {
            type: 'delta',
            content: result.value,
          }
          try {
            controller.enqueue(`data: ${JSON.stringify(msg)} \n\n`)
          } catch (e) {
            console.log(`Exception while sending chat message: ${e}`)
            downStreamError = true
            break
          }
          // Append the message after sending it to the client.
          // While it is not possible to keep what we store in db consistent
          // with what the client sees... it is fairly reasonable to assume
          // that if we fail to send it, the user has not seen it (But I'm not
          // sure that this is obvious)
          assistantMessage.content = assistantMessage.content + result.value
        }
      } catch (e) {
        console.log(`Exception while reading chat message: ${e}`)
      }
      // close the stream only if no enqueue() call has failed
      if (!downStreamError) {
        try {
          controller.close()
        } catch (e) {
          console.log(`Failed closing controller: ${e}`)
        }
      }
      if (saveWhenDone) await saveMessage(assistantMessage)
    },
  })

  return new NextResponse(responseStream, {
    headers: {
      'Content-Encoding': 'none',
      'Content-Type': 'text/event-stream',
    },
  })
}
