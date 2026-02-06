import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'What We Don\'t Track',
    description: 'See exactly what ZeroG does and doesn\'t collect about you. Radical transparency in social media.',
};

export default function TransparencyLayout({ children }: { children: React.ReactNode }) {
    return children;
}
