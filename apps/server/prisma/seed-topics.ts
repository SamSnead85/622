import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_TOPICS = [
    // Faith & Spirituality
    {
        slug: 'islam',
        name: 'Islam',
        description: 'Islamic teachings, Quran, Hadith, and spiritual growth',
        icon: '☪️',
        color: '#10B981',
    },
    {
        slug: 'christianity',
        name: 'Christianity',
        description: 'Christian faith, Bible study, and community',
        icon: '✝️',
        color: '#8B5CF6',
    },
    {
        slug: 'spirituality',
        name: 'Spirituality',
        description: 'Mindfulness, meditation, and spiritual wellness',
        icon: '🕉️',
        color: '#EC4899',
    },

    // Culture & Heritage
    {
        slug: 'culture',
        name: 'Culture & Heritage',
        description: 'Cultural traditions, languages, and global diversity',
        icon: '🌍',
        color: '#F59E0B',
    },
    {
        slug: 'arabic-culture',
        name: 'Arabic Culture',
        description: 'Arabic language, traditions, and Middle Eastern heritage',
        icon: '🕌',
        color: '#06B6D4',
    },
    {
        slug: 'african-diaspora',
        name: 'African Diaspora',
        description: 'African heritage, culture, and global connections',
        icon: '🌍',
        color: '#EF4444',
    },

    // Travel & Exploration
    {
        slug: 'travel',
        name: 'Travel & Adventure',
        description: 'Explore the world, travel tips, and cultural experiences',
        icon: '✈️',
        color: '#06B6D4',
    },
    {
        slug: 'hajj-umrah',
        name: 'Hajj & Umrah',
        description: 'Pilgrimage experiences, Mecca, Medina, and spiritual journeys',
        icon: '🕋',
        color: '#10B981',
    },

    // Tech & Innovation
    {
        slug: 'technology',
        name: 'Technology',
        description: 'Tech news, AI, coding, startups, and innovation',
        icon: '💻',
        color: '#3B82F6',
    },
    {
        slug: 'entrepreneurship',
        name: 'Entrepreneurship',
        description: 'Startups, business building, and financial independence',
        icon: '🚀',
        color: '#8B5CF6',
    },

    // Health & Wellness
    {
        slug: 'fitness',
        name: 'Fitness & Health',
        description: 'Workouts, nutrition, wellness, and healthy living',
        icon: '💪',
        color: '#10B981',
    },
    {
        slug: 'mental-health',
        name: 'Mental Health',
        description: 'Mental wellness, therapy, self-care, and emotional health',
        icon: '🧠',
        color: '#8B5CF6',
    },

    // Creative & Arts
    {
        slug: 'art',
        name: 'Art & Design',
        description: 'Visual art, graphic design, creativity, and inspiration',
        icon: '🎨',
        color: '#F97316',
    },
    {
        slug: 'photography',
        name: 'Photography',
        description: 'Photos, camera gear, editing, and visual storytelling',
        icon: '📷',
        color: '#A855F7',
    },
    {
        slug: 'music',
        name: 'Music',
        description: 'Music discovery, concerts, artists, and culture',
        icon: '🎵',
        color: '#EF4444',
    },

    // Food & Lifestyle
    {
        slug: 'food',
        name: 'Food & Cooking',
        description: 'Recipes, restaurants, halal food, and culinary culture',
        icon: '🍳',
        color: '#F59E0B',
    },
    {
        slug: 'fashion',
        name: 'Fashion & Style',
        description: 'Modest fashion, style tips, beauty, and lifestyle',
        icon: '👗',
        color: '#EC4899',
    },

    // Education & Growth
    {
        slug: 'education',
        name: 'Education & Learning',
        description: 'Online courses, Islamic studies, and knowledge sharing',
        icon: '📚',
        color: '#6366F1',
    },
    {
        slug: 'parenting',
        name: 'Parenting & Family',
        description: 'Raising children, family values, and parenting tips',
        icon: '👨‍👩‍👧‍👦',
        color: '#F59E0B',
    },

    // Community & Service
    {
        slug: 'community-service',
        name: 'Community Service',
        description: 'Volunteering, charity, sadaqah, and helping others',
        icon: '🤝',
        color: '#10B981',
    },
    {
        slug: 'social-justice',
        name: 'Social Justice',
        description: 'Advocacy, equality, human rights, and positive change',
        icon: '✊',
        color: '#EF4444',
    },

    // Entertainment & Sports
    {
        slug: 'gaming',
        name: 'Gaming',
        description: 'Video games, esports, game reviews, and gaming culture',
        icon: '🎮',
        color: '#8B5CF6',
    },
    {
        slug: 'sports',
        name: 'Sports',
        description: 'Football, basketball, athletics, and fan culture',
        icon: '⚽',
        color: '#22C55E',
    },
    {
        slug: 'entertainment',
        name: 'Movies & TV',
        description: 'Films, shows, reviews, and pop culture',
        icon: '🎬',
        color: '#A855F7',
    },

    // Nature & Science
    {
        slug: 'science',
        name: 'Science & Nature',
        description: 'Scientific discoveries, environment, and research',
        icon: '🔬',
        color: '#06B6D4',
    },
    {
        slug: 'pets',
        name: 'Pets & Animals',
        description: 'Pet care, wildlife, and animal stories',
        icon: '🐾',
        color: '#F59E0B',
    },
];

async function seedTopics() {
    console.log('🌱 Seeding topics...');

    for (const topic of DEFAULT_TOPICS) {
        await prisma.topic.upsert({
            where: { slug: topic.slug },
            update: topic,
            create: topic,
        });
        console.log(`✅ Created/Updated topic: ${topic.name}`);
    }

    console.log(`✅ ${DEFAULT_TOPICS.length} topics seeded successfully!`);
}

seedTopics()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
