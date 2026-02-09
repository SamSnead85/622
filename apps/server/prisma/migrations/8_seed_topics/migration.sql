-- Seed initial topics for feed personalization
INSERT INTO "Topic" (id, slug, name, description, icon, color, "postCount", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'technology', 'Technology', 'Tech news, gadgets, software, and innovation', 'hardware-chip-outline', '#3B82F6', 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'faith', 'Faith & Spirituality', 'Religious discussions, inspiration, and community', 'heart-outline', '#D4AF37', 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'family', 'Family', 'Parenting, family life, and relationships', 'people-outline', '#FF6B6B', 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'news', 'News & Current Events', 'World news, politics, and breaking stories', 'newspaper-outline', '#10B981', 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'sports', 'Sports', 'Sports news, highlights, and discussions', 'football-outline', '#FF6B35', 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'business', 'Business & Entrepreneurship', 'Startups, finance, careers, and business tips', 'briefcase-outline', '#8B5CF6', 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'art', 'Art & Design', 'Visual art, graphic design, photography, and creativity', 'color-palette-outline', '#EC4899', 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'health', 'Health & Wellness', 'Fitness, mental health, nutrition, and self-care', 'fitness-outline', '#34D399', 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'education', 'Education & Learning', 'Courses, tutorials, and knowledge sharing', 'school-outline', '#60A5FA', 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'food', 'Food & Cooking', 'Recipes, restaurants, halal food, and culinary culture', 'restaurant-outline', '#F59E0B', 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'travel', 'Travel & Culture', 'Travel tips, destinations, and cultural experiences', 'airplane-outline', '#06B6D4', 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'politics', 'Politics & Activism', 'Political discourse, movements, and social justice', 'megaphone-outline', '#F87171', 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'science', 'Science', 'Scientific discoveries, research, and space', 'flask-outline', '#A78BFA', 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'entertainment', 'Entertainment', 'Movies, TV, music, and pop culture', 'film-outline', '#F472B6', 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'gaming', 'Gaming', 'Video games, esports, and gaming culture', 'game-controller-outline', '#34D399', 0, true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
