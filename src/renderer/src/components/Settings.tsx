import React, { useState, useEffect } from 'react'

interface SettingsProps {
    onClose: () => void
}

export const Settings = ({ onClose }: SettingsProps): React.JSX.Element => {
    const [sheetId, setSheetId] = useState('')
    const [tabName, setTabName] = useState('Sheet1')
    const [shortcut, setShortcut] = useState('Alt+Shift+L')
    const [keyFilePath, setKeyFilePath] = useState('')
    const [webAppUrl, setWebAppUrl] = useState('')
    const [connectionType, setConnectionType] = useState<'service' | 'webapp'>('service')
    const [loading, setLoading] = useState(true)
    const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
    const [testing, setTesting] = useState(false)
    const [wellnessEnabled, setWellnessEnabled] = useState(true)
    const [wellnessInterval, setWellnessInterval] = useState(20)
    const [wellnessBreak, setWellnessBreak] = useState(20)
    const [quotesEnabled, setQuotesEnabled] = useState(false)
    const [updateStatus, setUpdateStatus] = useState<{ status: string, info?: any, progress?: any, error?: string } | null>(null)

    useEffect(() => {
        const loadSettings = async (): Promise<void> => {
            const settings = await window.electron.ipcRenderer.invoke('get-settings')
            setSheetId(settings.sheetId || '')
            setTabName(settings.tabName || 'Sheet1')
            setShortcut(settings.shortcut || 'Alt+Shift+L')
            setKeyFilePath(settings.keyFilePath || '')
            setWebAppUrl(settings.webAppUrl || '')
            setConnectionType(settings.connectionType || 'service')
            setWellnessEnabled(settings.wellnessEnabled !== false)
            setWellnessInterval(settings.wellnessInterval || 20)
            setWellnessBreak(settings.wellnessBreak || 20)
            setQuotesEnabled(settings.quotesEnabled || false)
            setLoading(false)
        }
        loadSettings()

        // Listen for updater status
        const removeListener = window.electron.ipcRenderer.on('updater-status', (_event, status) => {
            setUpdateStatus(status)
        })

        return () => {
            if (removeListener) removeListener()
        }
    }, [])

    const handleSave = async (): Promise<void> => {
        await window.electron.ipcRenderer.invoke('save-settings', {
            sheetId,
            tabName,
            shortcut,
            keyFilePath,
            webAppUrl,
            connectionType,
            wellnessEnabled,
            wellnessInterval,
            wellnessBreak,
            quotesEnabled
        })
        onClose()
    }

    const handleTestConnection = async (): Promise<void> => {
        setTesting(true)
        setTestStatus(null)
        try {
            const result = await window.electron.ipcRenderer.invoke('test-connection', {
                sheetId,
                tabName,
                keyFilePath,
                webAppUrl,
                connectionType
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

    return (
        <div className="glass-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 200 }}>
            <div className="draggable-header" />

            <div style={{ marginTop: '2.5rem', flex: 1, overflowY: 'auto' }}>
                <h2 style={{ fontFamily: 'Outfit', fontSize: '1.25rem', marginBottom: '1rem' }}>Settings</h2>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '8px' }}>
                    <button
                        onClick={() => setConnectionType('service')}
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            fontSize: '0.75rem',
                            background: connectionType === 'service' ? 'var(--primary)' : 'transparent',
                            color: connectionType === 'service' ? 'white' : 'var(--text-dim)'
                        }}
                    >
                        Service Account
                    </button>
                    <button
                        onClick={() => setConnectionType('webapp')}
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            fontSize: '0.75rem',
                            background: connectionType === 'webapp' ? 'var(--primary)' : 'transparent',
                            color: connectionType === 'webapp' ? 'white' : 'var(--text-dim)'
                        }}
                    >
                        Web App URL
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
                    {connectionType === 'service' ? (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Google Spreadsheet ID</label>
                                <input
                                    type="text"
                                    value={sheetId || ''}
                                    onChange={(e) => setSheetId(e.target.value)}
                                    placeholder="Enter Spreadsheet ID"
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Service Account Key (Path)</label>
                                <input
                                    type="text"
                                    value={keyFilePath || ''}
                                    onChange={(e) => setKeyFilePath(e.target.value)}
                                    placeholder="C:\path\to\key.json"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Google Apps Script URL</label>
                                <input
                                    type="text"
                                    value={webAppUrl || ''}
                                    onChange={(e) => setWebAppUrl(e.target.value)}
                                    placeholder="https://script.google.com/macros/s/.../exec"
                                />
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                                    Use this if Google Cloud Console is disabled.
                                </p>
                            </div>
                        </>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Tab Name</label>
                        <input
                            type="text"
                            value={tabName || ''}
                            onChange={(e) => setTabName(e.target.value)}
                            placeholder="e.g. Sheet1"
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Global Shortcut</label>
                        <input
                            type="text"
                            value={shortcut || ''}
                            onChange={(e) => setShortcut(e.target.value)}
                            placeholder="Alt+Shift+L"
                        />
                    </div>

                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>Koda Wellness</span>
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
                                    <input
                                        type="number"
                                        value={wellnessInterval}
                                        onChange={(e) => setWellnessInterval(parseInt(e.target.value))}
                                        style={{ width: '4rem', padding: '0.25rem' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Break duration (secs)</label>
                                    <input
                                        type="number"
                                        value={wellnessBreak}
                                        onChange={(e) => setWellnessBreak(parseInt(e.target.value))}
                                        style={{ width: '4rem', padding: '0.25rem' }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>Quote of the Hour</span>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button
                                    onClick={() => window.electron.ipcRenderer.invoke('test-quote')}
                                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                                >
                                    Test Notification
                                </button>
                                <input
                                    type="checkbox"
                                    checked={quotesEnabled}
                                    onChange={(e) => setQuotesEnabled(e.target.checked)}
                                    style={{ width: '1.2rem', height: '1.2rem' }}
                                />
                            </div>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                            Receive a random quote every hour. Click the notification to view it in full screen.
                        </p>
                    </div>

                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>Updates</span>
                            <button
                                onClick={() => window.electron.ipcRenderer.invoke('check-for-updates')}
                                disabled={updateStatus?.status === 'checking' || updateStatus?.status === 'downloading'}
                                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'var(--primary)', border: 'none' }}
                            >
                                {updateStatus?.status === 'checking' ? 'Checking...' : 'Check now'}
                            </button>
                        </div>

                        {updateStatus && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                                {updateStatus.status === 'checking' && <p>Checking for updates...</p>}
                                {updateStatus.status === 'available' && (
                                    <div>
                                        <p style={{ color: '#4ade80' }}>Update available: {updateStatus.info?.version}</p>
                                        <button
                                            onClick={() => window.electron.ipcRenderer.invoke('download-update')}
                                            style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.7rem' }}
                                        >
                                            Download Update
                                        </button>
                                    </div>
                                )}
                                {updateStatus.status === 'not-available' && <p>You are on the latest version.</p>}
                                {updateStatus.status === 'downloading' && (
                                    <div>
                                        <p>Downloading: {Math.round(updateStatus.progress?.percent || 0)}%</p>
                                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '0.25rem' }}>
                                            <div style={{ width: `${updateStatus.progress?.percent || 0}%`, height: '100%', background: 'var(--primary)', borderRadius: '2px' }} />
                                        </div>
                                    </div>
                                )}
                                {updateStatus.status === 'downloaded' && (
                                    <div>
                                        <p style={{ color: '#4ade80' }}>Update ready!</p>
                                        <button
                                            onClick={() => window.electron.ipcRenderer.invoke('install-update')}
                                            style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.7rem' }}
                                        >
                                            Restart and Install
                                        </button>
                                    </div>
                                )}
                                {updateStatus.status === 'error' && <p style={{ color: '#f87171' }}>Error: {updateStatus.error}</p>}
                            </div>
                        )}
                    </div>

                    {testStatus && (
                        <div style={{
                            fontSize: '0.75rem',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            background: testStatus.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: testStatus.type === 'success' ? '#4ade80' : '#f87171',
                            border: `1px solid ${testStatus.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                            marginTop: '0.5rem'
                        }}>
                            {testStatus.message}
                        </div>
                    )}

                    <button
                        onClick={handleTestConnection}
                        disabled={testing}
                        style={{
                            marginTop: '0.5rem',
                            background: 'transparent',
                            border: '1px solid var(--primary)',
                            color: 'var(--primary)',
                            opacity: testing ? 0.5 : 1
                        }}
                    >
                        {testing ? 'Testing...' : 'Test Connection'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={onClose} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}>
                    Cancel
                </button>
                <button onClick={handleSave} style={{ flex: 1 }}>
                    Save Changes
                </button>
            </div>
        </div>
    )
}
