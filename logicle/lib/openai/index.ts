import { OpenAIMessage } from '@/types/openai'
import { ProviderType } from '@/db/types'
import { Provider, ProviderType as LLMosaicProviderType } from 'llmosaic'
import { Message } from 'llmosaic/dist/types'
import { ChatCompletionCreateParams } from 'openai/resources/chat/completions'
import { MessageDTO } from '@/types/chat'

export interface ToolFunction {
  function: ChatCompletionCreateParams.Function
  invoke: (messages: MessageDTO[], params: Record<string, any>) => Promise<string>
}

export interface ToolImplementation {
  functions: ToolFunction[]
  upload?: (id: string, path: string, contentType?: string) => Promise<void>
}

export type ToolBuilder = (params: Record<string, any>) => ToolImplementation

export const LLMStream = (
  providerType: ProviderType,
  apiHost: string,
  model: string,
  apiKey: string,
  systemPrompt: string,
  temperature: number,
  messages: OpenAIMessage[],
  messageDtos: MessageDTO[],
  functions: ToolFunction[]
): ReadableStream<string> => {
  // Return a new ReadableStream

  const llm = new Provider({
    apiKey: apiKey,
    baseUrl: apiHost,
    providerType: providerType as LLMosaicProviderType,
  })
  // Do not wait for the stream to be available!
  const streamPromise = llm.completion({
    model: model,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...messages,
    ],
    functions: functions.length == 0 ? undefined : functions.map((f) => f.function),
    function_call: functions.length == 0 ? undefined : 'auto',
    temperature: temperature,
    stream: true,
  })

  return new ReadableStream<string>({
    async start(controller) {
      try {
        let completed = false
        let stream = await streamPromise
        while (!completed) {
          let funcName = ''
          let funcArgs = ''
          for await (const chunk of stream) {
            //console.log(`chunk is ${JSON.stringify(chunk)}`)
            if (chunk.choices[0]?.delta.function_call) {
              if (chunk.choices[0]?.delta.function_call.name)
                funcName += chunk.choices[0]?.delta.function_call.name
              if (chunk.choices[0]?.delta.function_call.arguments)
                funcArgs += chunk.choices[0]?.delta.function_call.arguments
            } else {
              controller.enqueue(chunk.choices[0]?.delta?.content || '')
            }
          }
          // If there's a function invocation, we execute it, make a new
          // completion request appending assistant function invocation and our response,
          // and restart as if "nothing had happened".
          // While it is not super clear, we believe that the context should not include
          // function calls
          if (funcName.length != 0) {
            const functionDef = functions.find((f) => f.function.name === funcName)
            if (functionDef == null) {
              throw new Error(`No such function: ${functionDef}`)
            }
            console.log(`Invoking function "${funcName}" with args ${funcArgs}`)
            const funcResult = await functionDef.invoke(messageDtos, JSON.parse(funcArgs))
            console.log(`Result is... ${funcResult}`)
            //console.log(`chunk is ${JSON.stringify(chunk)}`)
            stream = await llm.completion({
              model: model,
              messages: [
                {
                  role: 'system',
                  content: systemPrompt,
                },
                ...messages,
                {
                  role: 'assistant',
                  content: null,
                  function_call: {
                    name: funcName,
                    arguments: funcArgs,
                  },
                } as Message,
                {
                  role: 'function',
                  name: funcName,
                  content: funcResult,
                } as Message,
              ],
              functions: functions.map((f) => f.function),
              function_call: 'auto',
              temperature: temperature,
              stream: true,
            })
          } else {
            completed = true
          }
        }
        controller.close()
      } catch (error) {
        try {
          controller.enqueue('Internal error')
        } catch (e) {
          // swallowed exception. The stream might be closed
        }
        controller.error(error)
      }
    },
  })
}
