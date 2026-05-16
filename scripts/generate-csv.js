const Cerebras = require('@cerebras/cerebras_cloud_sdk')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const { loadEnvFile } = require('node:process')
loadEnvFile(path.resolve(__dirname, '../.env'))

console.log(process.env.CEREBRAS_API_KEY)

const cerebrasClient = new Cerebras({
	apiKey: process.env.CEREBRAS_API_KEY,
})

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL,
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CATEGORIES = [
	'comida',
	'transporte',
	'trabajo',
	'escuela',
	'verbos',
	'adjetivos',
	'tiempo',
	'adverbios',
	'sustantivos',
	'sinonimos',
	'antonimos',
	'salud',
	'compras',
	'japonés cotidiano',
	'calle',
	'deportes',
	'parejas',
	'viajes',
	'cocina',
	'hotel',
	'limpieza',
	'tecnologia',
]

// Map slug -> id from Supabase
const CATEGORY_ID_MAP = {}

const LEVELS = ['N4', 'N5']
const COUNT = 10
const DELAY_MS = 2000
const MAX_RETRIES = 3

const DELAY = (ms) => new Promise((r) => setTimeout(r, ms))

async function generateWithRetry(prompt, retries = MAX_RETRIES) {
	for (let attempt = 0; attempt < retries; attempt++) {
		try {
			const chatCompletion = await cerebrasClient.chat.completions.create(
				{
					model: 'zai-glm-4.7',
					messages: [{ role: 'user', content: prompt }],
				}
			)
			return chatCompletion?.choices?.[0]?.message?.content || ''
		} catch (error) {
			if (error?.type === 'too_many_requests_error') {
				const waitTime = Math.pow(2, attempt) * 1000
				console.log(`Rate limited, waiting ${waitTime}ms...`)
				await DELAY(waitTime)
				continue
			}
			throw error
		}
	}
	return null
}

async function loadCategoryIds() {
	console.log('Loading categories from Supabase...')
	const { data, error } = await supabase.from('categories').select('id, slug')
	if (error) throw error
	data.forEach((c) => {
		CATEGORY_ID_MAP[c.slug] = c.id
	})
	console.log(`Loaded ${data.length} categories`)
}

function parseCSVLine(str) {
	if (str === null || str === undefined) return ''
	if (str.includes(',') || str.includes('"') || str.includes('\n')) {
		return `"${str.replace(/"/g, '""')}"`
	}
	return str
}

async function main() {
	// Load category IDs from Supabase first
	await loadCategoryIds()

	const allWords = []
	const errors = []
	const totalRequests = CATEGORIES.length * LEVELS.length

	console.log(`Generating ${totalRequests} requests...`)
	console.log(`Total words expected: ${totalRequests * COUNT}`)

	let requestNum = 0

	for (const cat of CATEGORIES) {
		for (const lvl of LEVELS) {
			requestNum++
			console.log(`[${requestNum}/${totalRequests}] ${cat}/${lvl}`)

			const prompt = `Genera ${COUNT} palabras de japonés ${lvl} sobre "${cat}" en formato JSON array.
Cada objeto debe tener:
- word: palabra en kanji/kanji+hiragana
- kana: lectura en hiragana
- romaji: lectura en romaji
- meaning_es: significado en español
- meaning_en: significado en inglés
- jlpt_level: nivel JLPT (${lvl})
- example_jp: oración de ejemplo en japonés
- example_kana: lectura de la oración en hiragana
- example_es: traducción de la oración al español

Devuelve únicamente un array JSON válido, sin ningún texto antes o después. No inventes palabras que no existan en japonés real.
No dejes ningún campo vacío.`

			const content = await generateWithRetry(prompt)

			if (!content) {
				errors.push(`Failed: ${cat}/${lvl}`)
				continue
			}

			try {
				const match = content.match(/\[.*\]/s)
				if (!match) {
					errors.push(`No JSON: ${cat}/${lvl}`)
					continue
				}
				const words = JSON.parse(match[0])
				words.forEach((w) => {
					w.category_id = CATEGORY_ID_MAP[cat] || ''
					w.jlpt_level = lvl
				})
				allWords.push(...words)
			} catch (e) {
				errors.push(`Parse error: ${cat}/${lvl}`)
			}

			if (requestNum < totalRequests) {
				await DELAY(DELAY_MS)
			}
		}
	}

	console.log(`\nGenerated ${allWords.length} words`)
	if (errors.length > 0) {
		console.log(`Errors: ${errors.length}`)
		errors.forEach((e) => console.log(`  - ${e}`))
	}

	// Generate CSV matching words table columns
	const headers = [
		'word',
		'kana',
		'romaji',
		'meaning_es',
		'meaning_en',
		'jlpt_level',
		'category_id',
		'example_jp',
		'example_kana',
		'example_es',
	]

	const csvRows = [headers.join(',')]

	for (const w of allWords) {
		const row = [
			parseCSVLine(w.word || ''),
			parseCSVLine(w.kana || ''),
			parseCSVLine(w.romaji || ''),
			parseCSVLine(w.meaning_es || ''),
			parseCSVLine(w.meaning_en || ''),
			parseCSVLine(w.jlpt_level || ''),
			parseCSVLine(w.category_id || ''),
			parseCSVLine(w.example_jp || ''),
			parseCSVLine(w.example_kana || ''),
			parseCSVLine(w.example_es || ''),
		]
		csvRows.push(row.join(','))
	}

	const csvContent = csvRows.join('\n')
	const outputPath = path.join(__dirname, '..', 'vocabulario_jlpt.csv')
	fs.writeFileSync(outputPath, '\ufeff' + csvContent, 'utf8')

	console.log(`\nCSV saved to: ${outputPath}`)
	console.log(`Total rows: ${allWords.length}`)
	console.log(`\nCSV columns: ${headers.join(', ')}`)
}

main().catch(console.error)
