import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getTodaysTheme } from '@/lib/themes'

// ---------- Prompt chain types (tables managed in the admin app) ----------
type Step = {
  id: number
  order_by: number
  temperature: number | null
  system_prompt: string
  user_prompt: string
  llm_models: { id: number; name: string; provider_model_id: string; is_active: boolean } | null
}
type Chain = { flavorId: number | null; count: number; steps: Step[] }

// Used if the prompt chain tables are empty or unreachable, so posting never breaks.
const FALLBACK_SYSTEM = `You write captions for "NYC Caption Club." You speak like a chronically online Columbia junior who grew up in the Midwest and just moved to New York City. Use clever Gen Z internet humor. Be funny, not mean, and nothing offensive.`
const FALLBACK_USER = `Today's theme is "{theme}". Look at the photo and write {count} short, funny captions (max 15 words each). Connect them to the theme if you can.

Return ONLY a JSON array of {count} strings.`

async function loadChains(supabase: SupabaseClient): Promise<Chain[]> {
  const { data: mix, error } = await supabase
    .from('humor_flavor_mix')
    .select('humor_flavor_id, caption_count')
    .gt('caption_count', 0)
  if (error || !mix?.length) return [{ flavorId: null, count: 3, steps: [] }]

  const chains: Chain[] = []
  for (const m of mix) {
    const { data: steps } = await supabase
      .from('humor_flavor_steps')
      .select('id, order_by, temperature, system_prompt, user_prompt, llm_models(id, name, provider_model_id, is_active)')
      .eq('humor_flavor_id', m.humor_flavor_id)
      .order('order_by', { ascending: true })
    chains.push({
      flavorId: m.humor_flavor_id,
      count: Math.min(m.caption_count, 10),
      steps: (steps ?? []) as unknown as Step[],
    })
  }
  return chains
}

async function loadIngredients(supabase: SupabaseClient) {
  const [{ data: terms }, { data: examples }] = await Promise.all([
    supabase.from('terms').select('term, definition').order('priority', { ascending: false }).limit(15),
    supabase.from('caption_examples').select('image_description, caption').order('priority', { ascending: false }).limit(8),
  ])
  return {
    terms: (terms ?? []).map((t) => `- ${t.term}: ${t.definition}`).join('\n') || '(none)',
    examples: (examples ?? []).map((e) => `- Photo: ${e.image_description}\n  Caption: ${e.caption}`).join('\n') || '(none)',
  }
}

function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? vars[key] : match))
}

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

  // 1. Save the photo in Supabase Storage + the images table
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

  const theme = getTodaysTheme()
  const { data: image } = await supabase
    .from('images')
    .insert({ url: publicUrl, profile_id: user.id, description: theme })
    .select('id')
    .single()

  // 2. Run every prompt chain in the mix
  const chains = await loadChains(supabase)
  const { terms, examples } = await loadIngredients(supabase)
  const imageBase64 = Buffer.from(await file.arrayBuffer()).toString('base64')
  const mimeType = file.type || 'image/jpeg'

  const rows: { user_id: string; image_url: string; prompt: string; caption: string; theme: string }[] = []
  let lastError = ''

  for (const chain of chains) {
    const { data: req } = await supabase
      .from('caption_requests')
      .insert({ profile_id: user.id, image_id: image?.id ?? null, humor_flavor_id: chain.flavorId, theme })
      .select('id')
      .single()

    const steps: Step[] = chain.steps.length
      ? chain.steps
      : [{ id: 0, order_by: 1, temperature: 1, system_prompt: FALLBACK_SYSTEM, user_prompt: FALLBACK_USER, llm_models: null }]

    let previous = ''
    let failed = ''
    for (const step of steps) {
      const model =
        step.llm_models?.is_active && step.llm_models.provider_model_id
          ? step.llm_models.provider_model_id
          : process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite'
      const vars = { theme, count: String(chain.count), terms, examples, previous }
      const system = fill(step.system_prompt, vars)
      const userPrompt = fill(step.user_prompt, vars)
      const isLast = step === steps[steps.length - 1]

      const started = Date.now()
      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ parts: [{ text: userPrompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }] }],
            generationConfig: {
              temperature: Number(step.temperature ?? 1),
              ...(isLast ? { responseMimeType: 'application/json' } : {}),
            },
          }),
        }
      )
      const aiJson = await aiResponse.json()
      const text: string = (aiJson.candidates?.[0]?.content?.parts ?? [])
        .map((p: { text?: string }) => p.text ?? '')
        .join('')

      await supabase.from('llm_model_responses').insert({
        caption_request_id: req?.id ?? null,
        profile_id: user.id,
        llm_model_id: step.llm_models?.id ?? null,
        model_name: model,
        humor_flavor_step_id: step.id || null,
        system_prompt: system,
        user_prompt: userPrompt,
        response: aiResponse.ok ? text : JSON.stringify(aiJson.error ?? aiJson),
        status: aiResponse.ok ? 'success' : 'error',
        processing_time_ms: Date.now() - started,
      })

      if (!aiResponse.ok) {
        failed = aiJson.error?.message || 'AI request failed.'
        break
      }
      previous = text
    }

    let captions: string[] = []
    if (!failed) {
      try {
        const parsed = JSON.parse(previous)
        captions = (Array.isArray(parsed) ? parsed : []).filter((c) => typeof c === 'string').slice(0, chain.count)
      } catch {
        captions = []
      }
      if (captions.length === 0) failed = 'AI did not return captions. Try again.'
    }

    if (req?.id) {
      await supabase
        .from('caption_requests')
        .update({ status: failed ? 'error' : 'success', error_message: failed || null })
        .eq('id', req.id)
    }

    if (failed) {
      lastError = failed
      continue
    }
    const promptRecord = steps.map((s) => `${s.system_prompt}\n\n${s.user_prompt}`).join('\n\n---\n\n')
    for (const caption of captions) {
      rows.push({ user_id: user.id, image_url: publicUrl, prompt: promptRecord, caption, theme })
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: lastError || 'Something went wrong. Try again.' }, { status: 500 })
  }

  // 3. Save captions + the prompt in the database
  const { data, error } = await supabase.from('captions').insert(rows).select()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ captions: data })
}
