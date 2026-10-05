'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
    captionId: string
    initialScore: number
    initialUserVote: number // 1, -1, or 0
    userId: string | null
}

export default function VoteButtons({ captionId, initialScore, initialUserVote, userId }: Props) {
    const router = useRouter()
    const [score, setScore] = useState(initialScore)
    const [userVote, setUserVote] = useState(initialUserVote)
    const [busy, setBusy] = useState(false)

    const vote = async (value: 1 | -1) => {
        if (!userId) {
            router.push('/login')
            return
        }
        if (busy) return
        setBusy(true)

        const supabase = createClient()
        const previousVote = userVote
        const previousScore = score

        if (userVote === value) {
            // Clicking the same button again removes your vote
            setUserVote(0)
            setScore(score - value)
            const { error } = await supabase
                .from('votes')
                .delete()
                .eq('caption_id', captionId)
                .eq('user_id', userId)
            if (error) {
                setUserVote(previousVote)
                setScore(previousScore)
            }
        } else {
            // New vote, or switching from up to down (or down to up)
            setUserVote(value)
            setScore(score - userVote + value)
            const { error } = await supabase
                .from('votes')
                .upsert(
                    { caption_id: captionId, user_id: userId, value },
                    { onConflict: 'caption_id,user_id' }
                )
            if (error) {
                setUserVote(previousVote)
                setScore(previousScore)
            }
        }

        setBusy(false)
    }

    const buttonStyle = (active: boolean) => ({
        padding: '6px 12px',
        fontSize: 18,
        borderRadius: 8,
        border: '1px solid #555',
        cursor: 'pointer',
        background: active ? '#4f46e5' : 'transparent',
        color: active ? 'white' : 'inherit',
    })

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => vote(1)} style={buttonStyle(userVote === 1)} aria-label="Upvote">
                ▲
            </button>
            <strong style={{ minWidth: 24, textAlign: 'center' }}>{score}</strong>
            <button onClick={() => vote(-1)} style={buttonStyle(userVote === -1)} aria-label="Downvote">
                ▼
            </button>
            {!userId && <span style={{ fontSize: 12, color: '#888' }}>Sign in to vote</span>}
        </div>
    )
}