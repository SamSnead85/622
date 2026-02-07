import PostDetailClient from './PostDetailClient';

// Page is a thin server wrapper; metadata lives in layout.tsx
// The client component handles all rendering and interactivity
export default function PostPage() {
    return <PostDetailClient />;
}
