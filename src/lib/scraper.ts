import * as cheerio from 'cheerio'
import Anthropic from '@anthropic-ai/sdk'

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

export async function scrapeWebsite(url: string): Promise<{
  scraped_about: string
  scraped_products: string
  scraped_taglines: string[]
}> {
  try {
    // Ensure protocol — bare domains like "example.com" will throw in Node fetch
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url

    const html = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LumenBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    }).then(r => r.text())

    const $ = cheerio.load(html)
    $('script, style, nav, footer, header').remove()
    const pageText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 6000)

    const anthropic = getClient()
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a brand analyst. Analyze the following website text and extract key brand information.

Website text:
${pageText}

Respond ONLY with a valid JSON object with these exact keys. Write all text values in Slovak language:
{
  "about": "1-2 vety o tom, čo firma robí",
  "products": "čiarkami oddelený zoznam hlavných produktov/služieb",
  "taglines": ["akékoľvek slogany alebo taglines nájdené na webe"],
  "tone": "popis komunikačného štýlu značky"
}
Do not include any text outside the JSON object.`,
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonStr = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
    const scraped = JSON.parse(jsonStr)

    return {
      scraped_about: scraped.about || '',
      scraped_products: scraped.products || '',
      scraped_taglines: scraped.taglines || [],
    }
  } catch (err) {
    console.error('Scrape failed:', err)
    return { scraped_about: '', scraped_products: '', scraped_taglines: [] }
  }
}
