'use client'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const lines = content.split('\n').filter((l) => l.trim())

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim()

        // Heading
        if (/^#{1,3}\s+/.test(trimmed)) {
          const text = trimmed.replace(/^#{1,3}\s+/, '')
          return (
            <h3 key={idx} className="text-sm font-semibold text-slate-900 tracking-wide">
              {text}
            </h3>
          )
        }

        // Bullet point
        if (/^[-•*]\s+/.test(trimmed)) {
          const text = trimmed.replace(/^[-•*]\s+/, '')
          return (
            <div key={idx} className="flex items-start gap-2.5">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <p className="text-[0.9rem] leading-7 text-slate-700">{renderInline(text)}</p>
            </div>
          )
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-[0.9rem] leading-7 text-slate-700">
            {renderInline(trimmed)}
          </p>
        )
      })}
    </div>
  )
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}
