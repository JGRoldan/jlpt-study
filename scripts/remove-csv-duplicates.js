const fs = require('fs')
const path = require('path')

const INPUT_FILE = path.join(__dirname, '..', 'vocabulario_jlpt.csv')
const OUTPUT_FILE = path.join(__dirname, '..', 'vocabulario_jlpt_clean.csv')

function parseCSV(content) {
	const lines = content.split('\n').filter((line) => line.trim())
	const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))

	const rows = []
	for (let i = 1; i < lines.length; i++) {
		const values = []
		let current = ''
		let inQuotes = false

		for (const char of lines[i]) {
			if (char === '"') {
				inQuotes = !inQuotes
			} else if (char === ',' && !inQuotes) {
				values.push(current.trim().replace(/^"|"$/g, ''))
				current = ''
			} else {
				current += char
			}
		}
		values.push(current.trim().replace(/^"|"$/g, ''))

		const obj = {}
		headers.forEach((h, idx) => {
			obj[h] = values[idx] || ''
		})
		rows.push(obj)
	}

	return { headers, rows }
}

function generateCSV(headers, rows) {
	const escape = (val) => {
		if (val === null || val === undefined) return ''
		const str = String(val)
		if (str.includes(',') || str.includes('"') || str.includes('\n')) {
			return `"${str.replace(/"/g, '""')}"`
		}
		return str
	}

	const headerLine = headers.join(',')
	const dataLines = rows.map((row) => headers.map((h) => escape(row[h])).join(','))

	return '\ufeff' + [headerLine, ...dataLines].join('\n')
}

function main() {
	console.log('Leyendo CSV...')
	const content = fs.readFileSync(INPUT_FILE, 'utf8')
	const { headers, rows } = parseCSV(content)

	console.log(`Total de filas: ${rows.length}`)
	console.log(`Columnas: ${headers.join(', ')}`)

	// Find duplicates by word
	const seen = new Map()
	const duplicates = []
	const uniqueRows = []

	rows.forEach((row, index) => {
		const word = row.word?.toLowerCase()
		if (!word) return

		if (seen.has(word)) {
			duplicates.push({ word: row.word, rowIndex: index, keptIndex: seen.get(word) })
		} else {
			seen.set(word, uniqueRows.length)
			uniqueRows.push(row)
		}
	})

	console.log(`Palabras únicas: ${uniqueRows.length}`)
	console.log(`Duplicados encontrados: ${duplicates.length}`)

	if (duplicates.length > 0) {
		console.log('\nPrimeros 10 duplicados:')
		duplicates.slice(0, 10).forEach((d) => {
			console.log(`  - "${d.word}" (fila ${d.rowIndex + 2}, mantener fila ${d.keptIndex + 2})`)
		})
	}

	// Write clean CSV
	const cleanCSV = generateCSV(headers, uniqueRows)
	fs.writeFileSync(OUTPUT_FILE, cleanCSV, 'utf8')

	console.log(`\n✅ CSV limpio guardado en: ${OUTPUT_FILE}`)
	console.log(`   Total filas: ${uniqueRows.length}`)
}

main()