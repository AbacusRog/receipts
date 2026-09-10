// Cloudflare Pages Function: POST /api/extract
// Reads a just-uploaded document, sends it to Claude for field extraction,
// and writes the result to the `extractions` table.
//
// Required environment variables (set in Cloudflare Pages > Settings > Environment variables):
//   SUPABASE_URL              - same project URL as the frontend
//   SUPABASE_SERVICE_ROLE_KEY - service role key (server-side only, never exposed to the client)
//   ANTHROPIC_API_KEY         - Anthropic API key for extraction calls

import { createClient } from '@supabase/supabase-js'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ANTHROPIC_API_KEY: string
}

const EXTRACTION_PROMPT = `You are reading a UK business receipt or invoice. Extract the following fields
and respond with ONLY a JSON object, no other text, no markdown fences:

{
  "supplier": string or null,
  "document_date": "YYYY-MM-DD" or null,
  "net_amount": number or null,
  "vat_amount": number or null,
  "total_amount": number or null,
  "currency": "GBP" | "EUR" | "USD" | other ISO code,
  "category": a short guess at expense category (e.g. "Travel", "Office supplies", "Subsistence") or null,
  "confidence": number between 0 and 1, your confidence in the extraction as a whole
}

If a figure is genuinely illegible or absent, use null rather than guessing. Amounts are numbers, not strings.`

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  let documentId: string
  try {
    const body = await request.json<{ documentId?: string }>()
    if (!body.documentId) throw new Error('missing documentId')
    documentId = body.documentId
  } catch {
    return new Response(JSON.stringify({ error: 'documentId is required' }), { status: 400 })
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (docError || !doc) {
    return new Response(JSON.stringify({ error: 'document not found' }), { status: 404 })
  }

  await supabase.from('documents').update({ status: 'processing' }).eq('id', documentId)

  try {
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('receipts')
      .download(doc.file_path)

    if (downloadError || !fileBlob) throw new Error('could not download file')

    const arrayBuffer = await fileBlob.arrayBuffer()
    const base64 = arrayBufferToBase64(arrayBuffer)
    const isPdf = doc.file_type === 'application/pdf'

    const content = isPdf
      ? [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: EXTRACTION_PROMPT },
        ]
      : [
          { type: 'image', source: { type: 'base64', media_type: doc.file_type, data: base64 } },
          { type: 'text', text: EXTRACTION_PROMPT },
        ]

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!aiResponse.ok) {
      throw new Error(`Anthropic API error: ${aiResponse.status}`)
    }

    const aiData = await aiResponse.json<{ content: Array<{ type: string; text?: string }> }>()
    const textBlock = aiData.content.find((b) => b.type === 'text')
    if (!textBlock?.text) throw new Error('no text in AI response')

    const cleaned = textBlock.text.replace(/```json|```/g, '').trim()
    const extracted = JSON.parse(cleaned)

    await supabase.from('extractions').insert({
      document_id: documentId,
      supplier: extracted.supplier ?? null,
      document_date: extracted.document_date ?? null,
      net_amount: extracted.net_amount ?? null,
      vat_amount: extracted.vat_amount ?? null,
      total_amount: extracted.total_amount ?? null,
      currency: extracted.currency ?? 'GBP',
      category: extracted.category ?? null,
      confidence: extracted.confidence ?? null,
      raw_response: extracted,
    })

    await supabase.from('documents').update({ status: 'needs_review' }).eq('id', documentId)

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    await supabase.from('documents').update({ status: 'failed' }).eq('id', documentId)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}
