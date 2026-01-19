import React, { useState, useEffect } from 'react'
import Versions from './Versions'

interface SettingsProps {
    onClose: () => void
}

type TabType = 'task' | 'call' | 'wellness' | 'about'

export const Settings = ({ onClose }: SettingsProps): React.JSX.Element => {
    const [activeTab, setActiveTab] = useState<TabType>('task')
    const [loading, setLoading] = useState(true)
    const [testing, setTesting] = useState(false)
    const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

    // Task Settings
    const [tabName, setTabName] = useState('')
    const [shortcut, setShortcut] = useState('Alt+Shift+L')
    const [webAppUrl, setWebAppUrl] = useState('')

    // Call Log Settings
    const [callTabName, setCallTabName] = useState('')
    const [callShortcut, setCallShortcut] = useState('Alt+Shift+K')
    const [callWebAppUrl, setCallWebAppUrl] = useState('')

    // Wellness Settings
    const [wellnessEnabled, setWellnessEnabled] = useState(true)
    const [wellnessInterval, setWellnessInterval] = useState(20)
    const [wellnessBreak, setWellnessBreak] = useState(20)
    const [quotesEnabled, setQuotesEnabled] = useState(false)

    // Update Status
    const [updateStatus, setUpdateStatus] = useState<{ status: string, info?: any, progress?: any, error?: string } | null>(null)

    useEffect(() => {
        const loadSettings = async (): Promise<void> => {
            const settings = await window.electron.ipcRenderer.invoke('get-settings')
            setTabName(settings.tabName || '')
            setShortcut(settings.shortcut || 'Alt+Shift+L')
            setWebAppUrl(settings.webAppUrl || '')

            setCallTabName(settings.callTabName || '')
            setCallShortcut(settings.callShortcut || 'Alt+Shift+K')
            setCallWebAppUrl(settings.callWebAppUrl || '')

            setWellnessEnabled(settings.wellnessEnabled !== false)
            setWellnessInterval(settings.wellnessInterval || 20)
            setWellnessBreak(settings.wellnessBreak || 20)
            setQuotesEnabled(settings.quotesEnabled || false)
            setLoading(false)
        }
        loadSettings()

        const removeListener = window.electron.ipcRenderer.on('updater-status', (_event, status) => {
            setUpdateStatus(status)
        })

        return () => {
            if (removeListener) removeListener()
        }
    }, [])

    const handleSave = async (): Promise<void> => {
        await window.electron.ipcRenderer.invoke('save-settings', {
            tabName,
            shortcut,
            webAppUrl,
            callTabName,
            callShortcut,
            callWebAppUrl,
            wellnessEnabled,
            wellnessInterval,
            wellnessBreak,
            quotesEnabled
        })
        onClose()
    }

    const handleTestConnection = async (type: 'task' | 'call'): Promise<void> => {
        setTesting(true)
        setTestStatus(null)
        try {
            const result = await window.electron.ipcRenderer.invoke('test-connection', {
                type,
                tabName: type === 'task' ? tabName : callTabName,
                webAppUrl: type === 'task' ? webAppUrl : callWebAppUrl
            })

            if (result.success) {
                setTestStatus({ type: 'success', message: 'Connection successful! (Test entry added)' })
            } else {
                setTestStatus({ type: 'error', message: `Failed: ${result.error}` })
            }
        } catch (error: any) {
            setTestStatus({ type: 'error', message: `Error: ${error.message}` })
        } finally {
            setTesting(false)
        }
    }

    if (loading) return <div className="glass-container">Loading...</div>

    const TabButton = ({ id, label }: { id: TabType, label: string }) => (
        <button
            onClick={() => { setActiveTab(id); setTestStatus(null); }}
            style={{
                flex: 1,
                padding: '0.5rem',
                fontSize: '0.8rem',
                background: activeTab === id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: activeTab === id ? '#fff' : 'var(--text-dim)',
                border: 'none',
                borderRadius: '6px',
                transition: 'all 0.2s',
                cursor: 'pointer'
            }}
        >
            {label}
        </button>
    )

    return (
        <div className="glass-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
            <div className="draggable-header" />

            <div style={{ marginTop: '2rem', paddingBottom: '1rem' }}>
                <h2 style={{ fontFamily: 'Outfit', fontSize: '1.25rem', marginBottom: '1rem' }}>Settings</h2>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: '8px' }}>
                    <TabButton id="task" label="Tasks" />
                    <TabButton id="call" label="Calls" />
                    <TabButton id="wellness" label="Wellness" />
                    <TabButton id="about" label="About" />
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* TASK SETTINGS TAB */}
                    {activeTab === 'task' && (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Task Sheet Web App URL</label>
                                <input
                                    type="text"
                                    value={webAppUrl}
                                    onChange={(e) => setWebAppUrl(e.target.value)}
                                    placeholder="https://script.google.com/..."
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Tab Name</label>
                                <input
                                    type="text"
                                    value={tabName}
                                    onChange={(e) => setTabName(e.target.value)}
                                    placeholder="Sheet1"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Global Shortcut</label>
                                <input
                                    type="text"
                                    value={shortcut}
                                    onChange={(e) => setShortcut(e.target.value)}
                                    placeholder="Alt+Shift+L"
                                />
                            </div>
                            <button
                                onClick={() => handleTestConnection('task')}
                                disabled={testing}
                                style={{ marginTop: '0.5rem', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', opacity: testing ? 0.5 : 1 }}
                            >
                                {testing ? 'Testing...' : 'Test Task Connection'}
                            </button>
                        </>
                    )}

                    {/* CALL LOG SETTINGS TAB */}
                    {activeTab === 'call' && (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Call Log Web App URL</label>
                                <input
                                    type="text"
                                    value={callWebAppUrl}
                                    onChange={(e) => setCallWebAppUrl(e.target.value)}
                                    placeholder="https://script.google.com/..."
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Tab Name</label>
                                <input
                                    type="text"
                                    value={callTabName}
                                    onChange={(e) => setCallTabName(e.target.value)}
                                    placeholder="Sheet1"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Call Shortcut</label>
                                <input
                                    type="text"
                                    value={callShortcut}
                                    onChange={(e) => setCallShortcut(e.target.value)}
                                    placeholder="Alt+Shift+K"
                                />
                            </div>
                            <button
                                onClick={() => handleTestConnection('call')}
                                disabled={testing}
                                style={{ marginTop: '0.5rem', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', opacity: testing ? 0.5 : 1 }}
                            >
                                {testing ? 'Testing...' : 'Test Call Log Connection'}
                            </button>
                        </>
                    )}

                    {/* WELLNESS SETTINGS TAB */}
                    {activeTab === 'wellness' && (
                        <>
                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>Eye Strain Release</span>
                                    <input
                                        type="checkbox"
                                        checked={wellnessEnabled}
                                        onChange={(e) => setWellnessEnabled(e.target.checked)}
                                        style={{ width: '1.2rem', height: '1.2rem' }}
                                    />
                                </div>
                                {wellnessEnabled && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Break every (mins)</label>
                                            <input type="number" value={wellnessInterval} onChange={(e) => setWellnessInterval(parseInt(e.target.value))} style={{ width: '4rem', padding: '0.25rem' }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Break duration (secs)</label>
                                            <input type="number" value={wellnessBreak} onChange={(e) => setWellnessBreak(parseInt(e.target.value))} style={{ width: '4rem', padding: '0.25rem' }} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>Quote of the Hour</span>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <button onClick={() => window.electron.ipcRenderer.invoke('test-quote')} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>Test</button>
                                        <input
                                            type="checkbox"
                                            checked={quotesEnabled}
                                            onChange={(e) => setQuotesEnabled(e.target.checked)}
                                            style={{ width: '1.2rem', height: '1.2rem' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ABOUT TAB */}
                    {activeTab === 'about' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>Application Info</h3>
                                <Versions />
                                <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                    <p>Developed by: Your Name / Team</p>
                                    <p>App Version: 1.0.0</p>
                                </div>
                            </div>

                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>Updates</span>
                                    <button
                                        onClick={() => window.electron.ipcRenderer.invoke('check-for-updates')}
                                        disabled={updateStatus?.status === 'checking' || updateStatus?.status === 'downloading'}
                                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'var(--primary)', border: 'none' }}
                                    >
                                        {updateStatus?.status === 'checking' ? 'Checking...' : 'Check'}
                                    </button>
                                </div>
                                {updateStatus && (
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                                        {/* Simplified update status logic for brevity, replicate full logic if needed */}
                                        <p>Status: {updateStatus.status}</p>
                                        {updateStatus.error && <p style={{ color: '#f87171' }}>{updateStatus.error}</p>}
                                        {updateStatus.status === 'downloaded' && (
                                            <button onClick={() => window.electron.ipcRenderer.invoke('install-update')} style={{ marginTop: '0.5rem', width: '100%' }}>Restart & Install</button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {testStatus && (
                        <div style={{
                            fontSize: '0.75rem', padding: '0.75rem', borderRadius: '6px',
                            background: testStatus.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: testStatus.type === 'success' ? '#4ade80' : '#f87171',
                            border: `1px solid ${testStatus.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                        }}>
                            {testStatus.message}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}>Cancel</button>
                <button onClick={handleSave} style={{ flex: 1 }}>Save Changes</button>
            </div>
        </div>
    )
}
