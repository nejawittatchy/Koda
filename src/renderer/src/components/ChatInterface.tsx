import React, { useState, useRef, useEffect } from 'react'
import { Send, Settings as SettingsIcon, Phone, CheckSquare } from 'lucide-react'
import { Settings } from './Settings'

interface Message {
    id: string
    text: string
    sender: 'user' | 'ai'
    timestamp: Date
}

type Mode = 'task' | 'call'

export const ChatInterface = (): React.JSX.Element => {
    const [mode, setMode] = useState<Mode>('task')
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

    // Listen for events from main process
    useEffect(() => {
        const handleOpenSettings = (): void => setShowSettings(true)

        const handleSwitchMode = (_event: any, newMode: Mode): void => {
            setMode(newMode)
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: newMode === 'task'
                    ? 'Switched to Task Mode. Format: Duration | Customer | Task | Status | Remark'
                    : 'Switched to Call Mode. Format: Duration | Type (I/O) | Customer | Reason | Status | Remark',
                sender: 'ai',
                timestamp: new Date()
            }])
        }

        const cleanupSettings = window.electron.ipcRenderer.on('open-settings', handleOpenSettings)
        const cleanupMode = window.electron.ipcRenderer.on('switch-mode', handleSwitchMode)

        return () => {
            if (cleanupSettings) cleanupSettings()
            if (cleanupMode) cleanupMode()
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
            if (mode === 'task') {
                // Task Parsing: "Duration | Customer | Task | Status | Remark"
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
                        text: `✅ Task Logged: ${taskEntry.duration} for ${taskEntry.customer}`,
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
            } else {
                // Call Parsing: "Duration | Type | Customer | Reason | Status | Remark"
                const parts = currentInput.split('|').map(p => p.trim())
                const callEntry = {
                    duration: parts[0] || 'N/A',
                    type: parts[1] || 'I', // Default Incoming
                    customer: parts[2] || 'N/A',
                    reason: parts[3] || (parts.length === 1 ? currentInput : 'N/A'),
                    status: parts[4] || 'Logged',
                    remark: parts[5] || ''
                }

                const result = await window.electron.ipcRenderer.invoke('log-call', callEntry)

                if (result.success) {
                    setMessages(prev => [...prev, {
                        id: (Date.now() + 1).toString(),
                        text: `✅ Call Logged #${result.sn?.dailySN || '?'} (${result.sn?.cumulativeSN || '?'})`,
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
            }
        } catch (error: unknown) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 3).toString(),
                text: `❌ Error: ${(error instanceof Error ? error.message : String(error))}`,
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: mode === 'task' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: mode === 'task' ? '#38bdf8' : '#a855f7'
                        }}>
                            {mode === 'task' ? <CheckSquare size={18} /> : <Phone size={18} />}
                        </div>
                        <div>
                            <h2 style={{ fontFamily: 'Outfit', fontSize: '1.1rem', transition: 'all 0.3s' }}>
                                {mode === 'task' ? 'Task Logger' : 'Call Logger'}
                            </h2>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                                {mode === 'task' ? 'Alt+Shift+L' : 'Alt+Shift+K'}
                            </p>
                        </div>
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
                        placeholder={mode === 'task' ? "Duration | Customer | Task..." : "Duration | Type | Customer..."}
                        rows={1}
                        style={{
                            flex: 1,
                            minWidth: 0,
                            resize: 'none',
                            maxHeight: '100px',
                            paddingTop: '0.75rem',
                            overflowY: 'auto',
                            borderColor: mode === 'task' ? 'rgba(255,255,255,0.1)' : 'rgba(168, 85, 247, 0.3)'
                        }}
                    />
                    <button onClick={handleSend} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '42px', padding: '0', flexShrink: 0, background: mode === 'task' ? 'var(--primary)' : '#a855f7' }}>
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}
