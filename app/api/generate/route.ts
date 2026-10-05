import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTodaysTheme } from '@/lib/themes'

export async function POST(request: Request) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('image') as File | null
    if (!file) {
        return NextResponse.json({ error: 'No image uploaded.' }, { status: 400 })
    }

    // 1. Save the photo in Supabase Storage
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(path, file, { contentType: file.type })
    if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }
    const {
        data: { publicUrl },
    } = supabase.storage.from('uploads').getPublicUrl(path)

    // 2. Ask Gemini for captions
    const theme = getTodaysTheme()
    const prompt = `You write captions for "NYC Caption Club." Today's theme is "${theme}".
Look at the photo and write 3 short, funny captions (max 15 words each) in the voice of a
chronically online Columbia junior who grew up in the Midwest and just moved to New York City.
Use clever Gen Z internet humor. Be funny, not mean, and nothing offensive.
Connect them to today's theme if you can.
Return ONLY a JSON array of 3 strings.`

    const imageBase64 = Buffer.from(await file.arrayBuffer()).toString('base64')
    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash'

    const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': process.env.GEMINI_API_KEY!,
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: file.type || 'image/jpeg', data: imageBase64 } },
                        ],
                    },
                ],
                generationConfig: { responseMimeType: 'application/json' },
            }),
        }
    )

    const aiJson = await aiResponse.json()
    if (!aiResponse.ok) {
        return NextResponse.json(
            { error: aiJson.error?.message || 'AI request failed.' },
            { status: 500 }
        )
    }

    const text = (aiJson.candidates?.[0]?.content?.parts ?? [])
        .map((p: { text?: string }) => p.text ?? '')
        .join('')

    let captions: string[] = []
    try {
        captions = JSON.parse(text)
    } catch {
        captions = []
    }
    captions = captions.filter((c) => typeof c === 'string').slice(0, 3)

    if (captions.length === 0) {
        return NextResponse.json({ error: 'AI did not return captions. Try again.' }, { status: 500 })
    }

    // 3. Save captions + the prompt in the database
    const rows = captions.map((caption) => ({
        user_id: user.id,
        image_url: publicUrl,
        prompt,
        caption,
        theme,
    }))

    const { data, error } = await supabase.from('captions').insert(rows).select()
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ captions: data })
}