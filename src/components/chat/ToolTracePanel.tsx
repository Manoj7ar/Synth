'use client'

import { ToolEvent } from '@/types'
import { Wrench, CheckCircle, Brain } from 'lucide-react'

interface ToolTracePanelProps {
  events: ToolEvent[]
}

export function ToolTracePanel({ events }: ToolTracePanelProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Wrench size={18} />
          Tool Trace
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          Watch the AI agent work in real-time
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {events.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            Tool events will appear here when the agent works
          </div>
        ) : (
          events.map((event, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              {event.type === 'tool_call' && (
                <div>
                  <div className="flex items-center gap-2 text-blue-600 font-medium text-sm mb-2">
                    <Wrench size={14} />
                    Tool Call: {event.tool}
                  </div>
                  <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                    {JSON.stringify(event.params, null, 2)}
                  </pre>
                </div>
              )}
              
              {event.type === 'tool_result' && (
                <div>
                  <div className="flex items-center gap-2 text-green-600 font-medium text-sm mb-2">
                    <CheckCircle size={14} />
                    Tool Result
                  </div>
                  <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-32">
                    {JSON.stringify(event.result, null, 2)}
                  </pre>
                </div>
              )}
              
              {event.type === 'reasoning' && (
                <div>
                  <div className="flex items-center gap-2 text-purple-600 font-medium text-sm mb-2">
                    <Brain size={14} />
                    Reasoning
                  </div>
                  <p className="text-sm text-gray-700">{event.reasoning}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
