'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { getTodaysTheme } from '@/lib/themes'

type Caption = { id: string; caption: string }

export default function GeneratePage() {
    const theme = getTodaysTheme()
    const inputRef = useRef<HTMLInputElement>(null)
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState('')
    const [dragging, setDragging] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [captions, setCaptions] = useState<Caption[]>([])

    const handleFile = (f: File | null) => {
        setCaptions([])
        setError('')
        if (!f) return
        if (!f.type.startsWith('image/')) {
            setError('Please choose an image file.')
            return
        }
        if (f.size > 4 * 1024 * 1024) {
            setError('That photo is too big. Please pick one under 4 MB.')
            return
        }
        setFile(f)
        setPreview(URL.createObjectURL(f))
    }

    const reset = () => {
        setFile(null)
        setPreview('')
        setCaptions([])
        setError('')
    }

    const handleGenerate = async () => {
        if (!file) return
        setLoading(true)
        setError('')

        const formData = new FormData()
        formData.append('image', file)

        try {
            const res = await fetch('/api/generate', { method: 'POST', body: formData })
            const json = await res.json()
            if (!res.ok) {
                setError(json.error || 'Something went wrong. Try again.')
            } else {
                setCaptions(json.captions)
            }
        } catch {
            setError('Network error. Try again.')
        }
        setLoading(false)
    }

    return (
        <main className="container">
            <h1 className="page-title">Post a photo</h1>
            <p className="subtitle">
                Upload something you saw in NYC and AI will write 3 captions. Then everyone votes.
            </p>

            <div className="theme-banner">
                <div>
                    <div className="theme-label">Today&apos;s theme</div>
                    <div className="theme-name">{theme}</div>
                </div>
            </div>

            {!preview && (
                <div
                    className={`dropzone ${dragging ? 'dragging' : ''}`}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => {
                        e.preventDefault()
                        setDragging(true)
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault()
                        setDragging(false)
                        handleFile(e.dataTransfer.files?.[0] ?? null)
                    }}
                >
                    <div style={{ fontSize: 40 }}>📸</div>
                    <div style={{ fontWeight: 700 }}>Drop a photo here or click to choose</div>
                    <div className="muted small">JPG or PNG, under 4 MB</div>
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />

            {preview && <img src={preview} alt="Your photo" className="preview" />}

            {error && <p className="error">{error}</p>}

            {preview && captions.length === 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button onClick={handleGenerate} disabled={loading} className="btn btn-primary btn-lg" style={{ flex: 1 }}>
                        {loading ? '✨ Writing captions…' : '✨ Generate captions'}
                    </button>
                    <button onClick={reset} disabled={loading} className="btn btn-lg">
                        Change photo
                    </button>
                </div>
            )}

            {captions.length > 0 && (
                <div className="card" style={{ marginTop: 20, padding: 20 }}>
                    <div className="theme-label">Your captions are live 🎉</div>
                    {captions.map((c) => (
                        <div key={c.id} className="caption-row">
                            <span className="caption-text">{c.caption}</span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <Link href="/" className="btn btn-primary" style={{ flex: 1 }}>
                            See it on the feed →
                        </Link>
                        <button onClick={reset} className="btn">
                            Post another
                        </button>
                    </div>
                </div>
            )}
        </main>
    )
}