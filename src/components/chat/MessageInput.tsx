'use client'

import { useState, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'

interface MessageInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  theme?: 'default' | 'patient'
}

export function MessageInput({
  onSend,
  disabled,
  placeholder = 'Ask about your visit...',
  theme = 'default',
}: MessageInputProps) {
  const [message, setMessage] = useState('')

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex gap-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`resize-none ${
          theme === 'patient'
            ? 'border-[#e0d1b8] bg-[#fffaf0] text-slate-800'
            : ''
        }`}
        rows={2}
      />
      <Button 
        onClick={handleSubmit} 
        disabled={disabled || !message.trim()}
        size="icon"
        className="flex-shrink-0"
      >
        <Send size={18} />
      </Button>
    </div>
  )
}
