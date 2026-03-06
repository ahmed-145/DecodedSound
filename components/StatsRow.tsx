export default function StatsRow() {
    const stats = [
        { label: 'Genre scope', value: 'SDK only' },
        { label: 'AI engine', value: 'Groq LLaMA' },
        { label: 'No account', value: 'Fully open' },
    ]

    return (
        <div className="grid grid-cols-3 gap-4 mt-8 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            {stats.map(s => (
                <div key={s.label} className="ds-card p-4 text-center">
                    <div className="text-white font-semibold text-sm">{s.value}</div>
                    <div className="text-white/30 text-xs mt-0.5">{s.label}</div>
                </div>
            ))}
        </div>
    )
}
