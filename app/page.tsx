import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTodaysTheme } from '@/lib/themes'
import VoteButtons from '@/components/VoteButtons'

export const dynamic = 'force-dynamic'

type Vote = { value: number; user_id: string }
type CaptionRow = {
  id: string
  caption: string
  image_url: string
  theme: string | null
  created_at: string
  votes: Vote[]
}

export default async function Home({
                                     searchParams,
                                   }: {
  searchParams: Promise<{ sort?: string }>
}) {
  const { sort } = await searchParams
  const sortBy = sort === 'top' ? 'top' : 'new'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data } = await supabase
      .from('captions')
      .select('id, caption, image_url, theme, created_at, votes(value, user_id)')
      .order('created_at', { ascending: false })
      .limit(90)

  const captions = ((data as CaptionRow[]) ?? []).map((c) => ({
    ...c,
    score: c.votes.reduce((sum, v) => sum + v.value, 0),
    userVote: c.votes.find((v) => v.user_id === user?.id)?.value ?? 0,
  }))

  // Group the 3 captions for each photo together
  const groups = new Map<string, typeof captions>()
  for (const c of captions) {
    if (!groups.has(c.image_url)) groups.set(c.image_url, [])
    groups.get(c.image_url)!.push(c)
  }
  let posts = Array.from(groups.entries()).map(([image_url, items]) => ({
    image_url,
    theme: items[0].theme,
    items: items.sort((a, b) => b.score - a.score),
    best: Math.max(...items.map((i) => i.score)),
  }))
  if (sortBy === 'top') posts = posts.sort((a, b) => b.best - a.best)

  const theme = getTodaysTheme()

  const tabStyle = (active: boolean) => ({
    padding: '6px 14px',
    borderRadius: 999,
    border: '1px solid #555',
    textDecoration: 'none',
    color: active ? 'white' : 'inherit',
    background: active ? '#4f46e5' : 'transparent',
  })

  return (
      <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ marginBottom: 4 }}>NYC Caption Club</h1>
        <p style={{ marginTop: 0, color: '#888' }}>
          AI captions for real NYC moments. Vote for the funniest.
        </p>

        <div style={{ padding: 16, borderRadius: 12, border: '1px solid #4f46e5', marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#888' }}>TODAY&apos;S THEME</div>
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>{theme}</div>
          <Link href={user ? '/generate' : '/login'} style={{ display: 'inline-block', marginTop: 8 }}>
            {user ? '+ Upload a photo for today’s theme' : 'Sign in to post a photo'}
          </Link>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <Link href="/?sort=new" style={tabStyle(sortBy === 'new')}>New</Link>
          <Link href="/?sort=top" style={tabStyle(sortBy === 'top')}>Top</Link>
        </div>

        {posts.length === 0 && <p>No captions yet. Be the first to post!</p>}

        {posts.map((post) => (
            <article
                key={post.image_url}
                style={{ border: '1px solid #333', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}
            >
              <img src={post.image_url} alt="User photo" style={{ width: '100%', display: 'block' }} />
              <div style={{ padding: 16 }}>
                {post.theme && (
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>#{post.theme}</div>
                )}
                {post.items.map((c) => (
                    <div
                        key={c.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 0',
                          borderTop: '1px solid #222',
                        }}
                    >
                      <span>{c.caption}</span>
                      <VoteButtons
                          captionId={c.id}
                          initialScore={c.score}
                          initialUserVote={c.userVote}
                          userId={user?.id ?? null}
                      />
                    </div>
                ))}
              </div>
            </article>
        ))}
      </main>
  )
}