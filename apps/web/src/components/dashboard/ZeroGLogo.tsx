'use client';

export function ZeroGLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizes = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl' };
    return (
        <div className={`font-bold tracking-tight ${sizes[size]}`}>
            <span className="text-[#7C8FFF]">0</span>
            <span className="text-white">G</span>
        </div>
    );
}
