'use client';

export function SkipLinks() {
    return (
        <div className="fixed top-0 left-0 z-[100]">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#D4AF37] focus:text-black focus:font-semibold focus:rounded-lg focus:text-sm focus:outline-none focus:ring-2 focus:ring-white"
            >
                Skip to main content
            </a>
            <a
                href="#navigation"
                className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-48 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#D4AF37] focus:text-black focus:font-semibold focus:rounded-lg focus:text-sm focus:outline-none focus:ring-2 focus:ring-white"
            >
                Skip to navigation
            </a>
        </div>
    );
}
