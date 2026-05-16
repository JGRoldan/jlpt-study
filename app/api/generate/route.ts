import { NextRequest, NextResponse } from 'next/server';
import Cerebras from '@cerebras/cerebras_cloud_sdk';
import { getCategoryBySlug, insertWords, type InsertWord } from '@/services/words';

const client = new Cerebras({
	apiKey: process.env.CEREBRAS_API_KEY,
});

const DELAY_MS = 2000;
const MAX_RETRIES = 3;

async function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithRetry(
	prompt: string,
	retries = MAX_RETRIES
): Promise<string | null> {
	for (let attempt = 0; attempt < retries; attempt++) {
		try {
			const chatCompletion = (await client.chat.completions.create({
				model: 'qwen-3-235b-a22b-instruct-2507',
				messages: [{ role: 'user', content: prompt }],
			})) as { choices?: { message?: { content?: string } }[] };

			return chatCompletion?.choices?.[0]?.message?.content || '';
		} catch (error: any) {
			if (error?.type === 'too_many_requests_error') {
				const waitTime = Math.pow(2, attempt) * 1000;
				console.log(`Rate limited, waiting ${waitTime}ms...`);
				await delay(waitTime);
				continue;
			}
			throw error;
		}
	}
	return null;
}

export async function POST(request: NextRequest) {
	try {
		let { category, level, count = 10, save = false } = await request.json();

		const categories = Array.isArray(category) ? category : [category];
		const levels = Array.isArray(level) ? level : [level];

		let allWords: any[] = [];
		let errors: string[] = [];

		const totalRequests = categories.length * levels.length;
		console.log(`Generating ${totalRequests} requests (${categories.length} categories × ${levels.length} levels)`);

		for (let i = 0; i < categories.length; i++) {
			for (let j = 0; j < levels.length; j++) {
				const cat = categories[i];
				const lvl = levels[j];
				const requestNum = i * levels.length + j + 1;

				console.log(`Request ${requestNum}/${totalRequests}: ${cat}/${lvl}`);

				const prompt = `Genera ${count} palabras de japonés ${lvl} sobre "${cat}" en formato JSON array.
Cada objeto debe tener:
- word: palabra en kanji/kanji+hiragana
- kana: lectura en hiragana
- romaji: lectura en romaji
- meaning_es: significado en español
- jlpt_level: nivel JLPT (${lvl})
- example_jp: oración de ejemplo en japonés
- example_kana: lectura de la oración en hiragana
- example_es: traducción de la oración al español

Devuelve únicamente un array JSON válido, sin ningún texto antes o después. No inventes palabras que no existan en japonés real.
No dejes ningún campo vacío.`;

				const content = await generateWithRetry(prompt);

				if (!content) {
					errors.push(`Failed after ${MAX_RETRIES} retries: ${cat}/${lvl}`);
					continue;
				}

				try {
					const match = content.match(/\[.*\]/s);
					if (!match) {
						errors.push(`No se encontró JSON para ${cat}/${lvl}`);
						continue;
					}
					const words = JSON.parse(match[0]);
					words.forEach((w: any) => {
						w.category = cat;
						w.jlpt_level = lvl;
					});
					allWords = allWords.concat(words);
				} catch {
					errors.push(`Error parseando respuesta para ${cat}/${lvl}`);
					continue;
				}

				if (requestNum < totalRequests) {
					await delay(DELAY_MS);
				}
			}
		}

		if (errors.length > 0 && allWords.length === 0) {
			return NextResponse.json(
				{ error: 'No se pudo generar contenido', details: errors },
				{ status: 500 }
			);
		}

		if (save && allWords.length > 0) {
			const wordsToInsert: InsertWord[] = [];

			for (const w of allWords) {
				const categoryData = await getCategoryBySlug(w.category);
				if (!categoryData) {
					console.warn(`Categoría no encontrada: ${w.category}`);
					continue;
				}

				wordsToInsert.push({
					word: w.word,
					kana: w.kana || '',
					romaji: w.romaji || null,
					meaning_es: w.meaning_es,
					meaning_en: null,
					jlpt_level: w.jlpt_level,
					category_id: categoryData.id,
					example_jp: w.example_jp || null,
					example_kana: w.example_kana || null,
					example_es: w.example_es || null,
				});
			}

			const result = await insertWords(wordsToInsert);

			return NextResponse.json({
				words: allWords,
				saved: result,
				errors: errors.length > 0 ? errors : undefined,
			});
		}

		return NextResponse.json({
			words: allWords,
			errors: errors.length > 0 ? errors : undefined,
		});
	} catch (error) {
		console.error('Error generating words:', error);
		return NextResponse.json(
			{ error: 'Failed to generate words' },
			{ status: 500 }
		);
	}
}