import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
	title: {
		default: 'JLPT Flashcards',
		template: '%s | JLPT Flashcards',
	},
	description: 'Aprende japonés JLPT N5/N4 con repetición espaciada, flashcards y quizzes',
	keywords: ['JLPT', 'japonés', 'aprendizaje', 'N5', 'N4', 'flashcards', 'espaciado'],
	authors: [{ name: 'JGRoldan' }],
	openGraph: {
		title: 'JLPT Flashcards',
		description: 'Aprende japonés JLPT N5/N4 con repetición espaciada',
		url: 'https://jlpt-flashcards.vercel.app',
		siteName: 'JLPT Flashcards',
		locale: 'es_ES',
		type: 'website',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'JLPT Flashcards',
		description: 'Aprende japonés JLPT N5/N4 con repetición espaciada',
	},
	robots: {
		index: true,
		follow: true,
	},
	icons: {
		icon: '/icon.svg',
	},
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang='es'>
			<body className='min-h-screen bg-background text-foreground flex flex-col'>
				<main className='flex-1'>{children}</main>
				<footer className='py-4 text-center text-sm text-gray-500 border-t'>
					<a
						href='https://github.com/JGRoldan'
						target='_blank'
						rel='noopener noreferrer'
						className='text-blue-600 hover:underline'
					>
						@JGRoldan
					</a>
					<span className='mx-2'>•</span>
					<span>© 2026 JLPT Flashcards</span>
				</footer>
			</body>
		</html>
	)
}
