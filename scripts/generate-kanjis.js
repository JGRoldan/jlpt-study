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

const LEVELS = ['N5', 'N4']
const BATCH_SIZE = 30
const BATCHES_PER_LEVEL = 10
const DELAY_MS = 5000
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

function parseCSVLine(str) {
	if (str === null || str === undefined) return ''
	if (Array.isArray(str)) return str.join(';')
	const s = String(str)
	if (s.includes(',') || s.includes('"') || s.includes('\n')) {
		return `"${s.replace(/"/g, '""')}"`
	}
	return s
}

function saveProgress(kanjis, pathOverride = null) {
	const headers = [
		'kanji',
		'meaning_es',
		'onyomi',
		'kunyomi',
		'jlpt_level',
		'stroke_count',
		'examples',
	]
	const csvRows = [headers.join(',')]

	for (const k of kanjis) {
		const onyomiStr = Array.isArray(k.onyomi)
			? k.onyomi.join(';')
			: k.onyomi || ''
		const kunyomiStr = Array.isArray(k.kunyomi)
			? k.kunyomi.join(';')
			: k.kunyomi || ''
		const examplesStr = Array.isArray(k.examples)
			? k.examples.join(';')
			: k.examples || ''

		const row = [
			parseCSVLine(k.kanji || ''),
			parseCSVLine(k.meaning_es || ''),
			parseCSVLine(onyomiStr),
			parseCSVLine(kunyomiStr),
			parseCSVLine(k.jlpt_level || ''),
			parseCSVLine(k.stroke_count || ''),
			parseCSVLine(examplesStr),
		]
		csvRows.push(row.join(','))
	}

	const csvContent = csvRows.join('\n')
	const outputPath =
		pathOverride || path.join(__dirname, '..', 'kanjis_jlpt.csv')
	fs.writeFileSync(outputPath, '\ufeff' + csvContent, 'utf8')
	console.log(`  -> Guardado progreso: ${kanjis.length} kanjis`)
}

async function generateExtraKanjis(level, needed, seen) {
	const prompt = `Genera EXACTAMENTE ${needed} kanjis de nivel ${level} que NO esten en esta lista: ${Array.from(seen).join(', ')}.
Cada objeto debe tener:
- kanji: un solo caracter kanji
- meaning_es: significado en espanol
- onyomi: array de lecturas onyomi
- kunyomi: array de lecturas kunyomi
- stroke_count: numero de trazos
- examples: array de 3 palabras separados por punto y coma

Solo devuelve el JSON array, sin texto adicional.`

	const content = await generateWithRetry(prompt)
	if (!content) return []

	try {
		const cleaned = content
			.replace(/[\x00-\x1F\x7F]/g, '')
			.replace(/\\n/g, ' ')
			.replace(/\t/g, ' ')

		const match = cleaned.match(/\[[\s\S]*\]/m)
		if (!match) return []

		let kanjis = JSON.parse(match[0])
		if (!Array.isArray(kanjis)) return []

		return kanjis.filter((k) => {
			if (!k.kanji || !k.meaning_es || !k.stroke_count) return false
			if (!Array.isArray(k.onyomi) || k.onyomi.length === 0) return false
			if (!Array.isArray(k.kunyomi) || k.kunyomi.length === 0)
				return false
			if (!Array.isArray(k.examples) || k.examples.length === 0)
				return false
			const char = k.kanji.trim()
			if (seen.has(char)) return false
			seen.add(char)
			return true
		})
	} catch {
		return []
	}
}

async function main() {
	const allKanjis = []
	const seenKanjis = new Set()
	const errors = []
	const totalRequests = LEVELS.length * BATCHES_PER_LEVEL

	console.log(`Generating ${totalRequests} requests...`)
	console.log(`Total kanjis expected: ${totalRequests * BATCH_SIZE}`)

	for (let i = 0; i < LEVELS.length; i++) {
		const lvl = LEVELS[i]

		for (let batch = 1; batch <= BATCHES_PER_LEVEL; batch++) {
			console.log(
				`[${i * BATCHES_PER_LEVEL + batch}/${totalRequests}] ${lvl} - batch ${batch}`
			)

			const prompt = `Genera EXACTAMENTE ${BATCH_SIZE} kanjis de nivel ${lvl} en formato JSON array.
Cada objeto debe tener:
- kanji: un solo caracter kanji
- meaning_es: significado en espanol
- onyomi: array de lecturas onyomi
- kunyomi: array de lecturas kunyomi
- stroke_count: numero de trazos
- examples: array de 3 palabras

Solo devuelve el JSON array, sin texto adicional.`

			const content = await generateWithRetry(prompt)

			if (!content) {
				errors.push(`Failed: ${lvl} batch ${batch}`)
				continue
			}

			try {
				const cleaned = content
					.replace(/[\x00-\x1F\x7F]/g, '')
					.replace(/\\n/g, ' ')
					.replace(/\t/g, ' ')

				const match = cleaned.match(/\[[\s\S]*\]/m)
				if (!match) {
					errors.push(`No JSON: ${lvl} batch ${batch}`)
					continue
				}

				let kanjis = JSON.parse(match[0])
				if (!Array.isArray(kanjis)) {
					errors.push(`No es array: ${lvl} batch ${batch}`)
					continue
				}

				const validKanjis = []
				for (const k of kanjis) {
					if (!k.kanji || !k.meaning_es || !k.stroke_count) continue
					if (!Array.isArray(k.onyomi) || k.onyomi.length === 0)
						continue
					if (!Array.isArray(k.kunyomi) || k.kunyomi.length === 0)
						continue
					if (!Array.isArray(k.examples) || k.examples.length === 0)
						continue
					validKanjis.push(k)
				}

				let newCount = 0
				for (const k of validKanjis) {
					const kanjiChar = k.kanji.trim()
					if (seenKanjis.has(kanjiChar)) {
						continue
					}
					seenKanjis.add(kanjiChar)
					k.jlpt_level = lvl
					allKanjis.push(k)
					newCount++
				}

				console.log(
					`  -> ${newCount}/${validKanjis.length} nuevos (${allKanjis.length} total)`
				)

				saveProgress(allKanjis)

				if (newCount < BATCH_SIZE * 0.5) {
					console.log(
						`  -> Pidiendo kanjis extra por pocos nuevos...`
					)
					let extraNeeded = BATCH_SIZE - newCount
					let extraAttempts = 0
					const maxExtraAttempts = 5

					while (
						extraNeeded > 0 &&
						extraAttempts < maxExtraAttempts
					) {
						const extraKanjis = await generateExtraKanjis(
							lvl,
							extraNeeded,
							seenKanjis
						)
						for (const k of extraKanjis) {
							k.jlpt_level = lvl
							allKanjis.push(k)
							extraNeeded--
						}
						console.log(
							`  -> +${extraKanjis.length} extra (faltan: ${extraNeeded})`
						)
						extraAttempts++

						if (
							extraNeeded > 0 &&
							extraAttempts < maxExtraAttempts
						) {
							await DELAY(DELAY_MS)
						}
					}
					saveProgress(allKanjis)
				}
			} catch (e) {
				console.log(`Error: ${e.message}`)
				errors.push(`Parse error: ${lvl} batch ${batch}`)
			}

			if (batch < BATCHES_PER_LEVEL) {
				await DELAY(DELAY_MS)
			}
		}
	}

	console.log(`\nGenerated ${allKanjis.length} kanjis sin duplicados`)
	if (errors.length > 0) {
		console.log(`Errores: ${errors.length}`)
	}

	const headers = [
		'kanji',
		'meaning_es',
		'onyomi',
		'kunyomi',
		'jlpt_level',
		'stroke_count',
		'examples',
	]
	const csvRows = [headers.join(',')]

	for (const k of allKanjis) {
		const onyomiStr = Array.isArray(k.onyomi)
			? k.onyomi.join(';')
			: k.onyomi || ''
		const kunyomiStr = Array.isArray(k.kunyomi)
			? k.kunyomi.join(';')
			: k.kunyomi || ''
		const examplesStr = Array.isArray(k.examples)
			? k.examples.join(';')
			: k.examples || ''

		const row = [
			parseCSVLine(k.kanji || ''),
			parseCSVLine(k.meaning_es || ''),
			parseCSVLine(onyomiStr),
			parseCSVLine(kunyomiStr),
			parseCSVLine(k.jlpt_level || ''),
			parseCSVLine(k.stroke_count || ''),
			parseCSVLine(examplesStr),
		]
		csvRows.push(row.join(','))
	}

	const csvContent = csvRows.join('\n')
	const outputPath = path.join(__dirname, '..', 'kanjis_jlpt_new.csv')
	fs.writeFileSync(outputPath, '\ufeff' + csvContent, 'utf8')

	console.log(`\nCSV saved to: ${outputPath}`)
	console.log(`Total rows: ${allKanjis.length}`)
}

main().catch(console.error)
