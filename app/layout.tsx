import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
	title: 'JLPT Flashcards',
	description: 'Aprende japonés con repetición espaciada',
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
