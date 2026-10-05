'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getTodaysTheme } from '@/lib/themes'

type Caption = { id: string; caption: string; image_url: string }

export default function GeneratePage() {
    const theme = getTodaysTheme()
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [captions, setCaptions] = useState<Caption[]>([])

    const handleFile = (f: File | null) => {
        setCaptions([])
        setError('')
        if (f && f.size > 4 * 1024 * 1024) {
            setError('That photo is too big. Please pick one under 4 MB.')
            setFile(null)
            setPreview('')
            return
        }
        setFile(f)
        setPreview(f ? URL.createObjectURL(f) : '')
    }

    const handleGenerate = async () => {
        if (!file) return
        setLoading(true)
        setError('')
        setCaptions([])

        const formData = new FormData()
        formData.append('image', file)

        const res = await fetch('/api/generate', { method: 'POST', body: formData })
        const json = await res.json()
        setLoading(false)

        if (!res.ok) {
            setError(json.error || 'Something went wrong.')
            return
        }
        setCaptions(json.captions)
    }

    return (
        <main style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 560, margin: '0 auto' }}>
            <h1>Make a Caption</h1>
            <p>
                Today&apos;s theme: <strong>{theme}</strong>
            </p>
            <p style={{ color: '#888' }}>
                Upload a photo from your day in NYC and get 3 AI captions. Then everyone can vote on them.
            </p>

            <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                style={{ marginTop: 16 }}
            />

            {preview && (
                <img
                    src={preview}
                    alt="Your photo"
                    style={{ display: 'block', width: '100%', marginTop: 16, borderRadius: 12 }}
                />
            )}

            <button
                onClick={handleGenerate}
                disabled={!file || loading}
                style={{
                    marginTop: 16,
                    padding: '12px 24px',
                    fontSize: 16,
                    borderRadius: 8,
                    cursor: file && !loading ? 'pointer' : 'not-allowed',
                }}
            >
                {loading ? 'Cooking up captions…' : 'Generate captions'}
            </button>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {captions.length > 0 && (
                <div style={{ marginTop: 24 }}>
                    <h2>Your captions</h2>
                    <ul>
                        {captions.map((c) => (
                            <li key={c.id} style={{ marginBottom: 8 }}>
                                {c.caption}
                            </li>
                        ))}
                    </ul>
                    <Link href="/">See them on the feed and vote →</Link>
                </div>
            )}
        </main>
    )
}