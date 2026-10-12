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

    const hint = userId ? undefined : 'Sign in to vote'

    return (
        <div className="vote" title={hint}>
            <button
                onClick={() => vote(1)}
                className={`vote-btn up ${userVote === 1 ? 'active' : ''}`}
                aria-label="Upvote"
            >
                ▲
            </button>
            <span className="score">{score}</span>
            <button
                onClick={() => vote(-1)}
                className={`vote-btn down ${userVote === -1 ? 'active' : ''}`}
                aria-label="Downvote"
            >
                ▼
            </button>
        </div>
    )
}