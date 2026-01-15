import React, { useState, useRef, useEffect } from 'react'
import { Send, Settings as SettingsIcon } from 'lucide-react'
import { Settings } from './Settings'

interface Message {
    id: string
    text: string
    sender: 'user' | 'ai'
    timestamp: Date
}

export const ChatInterface = (): React.JSX.Element => {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: 'Hi! Let\'s log your task. What did you work on?', sender: 'ai', timestamp: new Date() }
    ])
    const [input, setInput] = useState('')
    const [showSettings, setShowSettings] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    // Listen for 'open-settings' from main process (tray menu)
    useEffect(() => {
        const handleOpenSettings = (): void => setShowSettings(true)
        window.electron.ipcRenderer.on('open-settings', handleOpenSettings)
        return () => {
            window.electron.ipcRenderer.removeAllListeners('open-settings')
        }
    }, [])

    const handleSend = async (): Promise<void> => {
        if (!input.trim()) return

        const newMessage: Message = {
            id: Date.now().toString(),
            text: input,
            sender: 'user',
            timestamp: new Date()
        }

        setMessages([...messages, newMessage])
        const currentInput = input
        setInput('')

        try {
            // Basic parsing logic: "Duration | Customer | Task | Status | Remark"
            // Split by pipe or fallback to defaults
            const parts = currentInput.split('|').map(p => p.trim())

            const taskEntry = {
                date: new Date().toLocaleDateString(),
                duration: parts[0] || 'N/A',
                customer: parts[1] || 'N/A',
                issue: parts[2] || (parts.length === 1 ? currentInput : 'N/A'),
                status: parts[3] || 'Logged',
                remark: parts[4] || ''
            }

            const result = await window.electron.ipcRenderer.invoke('log-task', taskEntry)

            if (result.success) {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    text: `✅ Logged: ${taskEntry.duration} for ${taskEntry.customer}`,
                    sender: 'ai',
                    timestamp: new Date()
                }])
            } else {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 2).toString(),
                    text: `❌ Error: ${result.error || 'Check settings'}`,
                    sender: 'ai',
                    timestamp: new Date()
                }])
            }
        } catch (error: any) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 3).toString(),
                text: `❌ Error: ${error.message}`,
                sender: 'ai',
                timestamp: new Date()
            }])
        }
    }

    return (
        <div style={{ height: '100%', position: 'relative' }}>
            {showSettings && <Settings onClose={() => setShowSettings(false)} />}

            <div className="glass-container">
                <div className="draggable-header" />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', marginTop: '1.5rem' }}>
                    <div>
                        <h2 style={{ fontFamily: 'Outfit', fontSize: '1.25rem' }}>Koda</h2>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Your Personal Wellbeing Companion</p>
                    </div>
                    <button
                        onClick={() => setShowSettings(true)}
                        style={{ padding: '0.5rem', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <SettingsIcon size={20} color="#94a3b8" />
                    </button>
                </div>

                <div
                    ref={scrollRef}
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        paddingRight: '0.5rem',
                        marginBottom: '1rem'
                    }}
                >
                    {messages.map(msg => (
                        <div key={msg.id} className={`chat-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
                            <p style={{ fontSize: '0.925rem', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                            <span style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '0.25rem', display: 'block' }}>
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSend()
                            }
                        }}
                        placeholder="Duration | Customer | Task..."
                        rows={1}
                        style={{
                            flex: 1,
                            minWidth: 0,
                            resize: 'none',
                            maxHeight: '100px',
                            paddingTop: '0.75rem',
                            overflowY: 'auto'
                        }}
                    />
                    <button onClick={handleSend} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '42px', padding: '0', flexShrink: 0 }}>
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}
