// ============================================
// Trivia Question Engine
// Topic-based categories with AI-ready architecture
// ============================================

// ============================================
// Types & Interfaces
// ============================================

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category: TriviaCategory;
  difficulty: 'easy' | 'medium' | 'hard';
}

export type TriviaCategory =
  | 'islamic'
  | 'quran'
  | 'history'
  | 'science'
  | 'geography'
  | 'pop_culture'
  | 'sports'
  | 'food'
  | 'technology'
  | 'literature'
  | 'general';

export const CATEGORY_INFO: Record<
  TriviaCategory,
  { label: string; icon: string; color: string }
> = {
  islamic: { label: 'Islamic Knowledge', icon: 'moon-outline', color: 'gold' },
  quran: { label: 'Quran & Hadith', icon: 'book-outline', color: 'gold' },
  history: { label: 'World History', icon: 'time-outline', color: 'azure' },
  science: { label: 'Science & Nature', icon: 'flask-outline', color: 'emerald' },
  geography: { label: 'Geography', icon: 'globe-outline', color: 'azure' },
  pop_culture: { label: 'Pop Culture', icon: 'film-outline', color: 'coral' },
  sports: { label: 'Sports', icon: 'football-outline', color: 'emerald' },
  food: { label: 'Food & Cuisine', icon: 'restaurant-outline', color: 'gold' },
  technology: { label: 'Technology', icon: 'hardware-chip-outline', color: 'azure' },
  literature: { label: 'Literature', icon: 'library-outline', color: 'coral' },
  general: { label: 'General Knowledge', icon: 'bulb-outline', color: 'gold' },
};

export const ALL_CATEGORIES: TriviaCategory[] = Object.keys(
  CATEGORY_INFO,
) as TriviaCategory[];

// ============================================
// Question Bank — Islamic Knowledge (40+)
// ============================================

const islamicQuestions: TriviaQuestion[] = [
  {
    id: 'isl-001',
    question: 'What is the first pillar of Islam?',
    options: ['Shahada', 'Salah', 'Zakat', 'Hajj'],
    correctIndex: 0,
    category: 'islamic',
    difficulty: 'easy',
  },
  {
    id: 'isl-002',
    question: 'How many times a day do Muslims pray?',
    options: ['3', '4', '5', '7'],
    correctIndex: 2,
    category: 'islamic',
    difficulty: 'easy',
  },
  {
    id: 'isl-003',
    question: 'What is the holy month of fasting called?',
    options: ['Shawwal', 'Ramadan', 'Muharram', 'Dhul Hijjah'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'easy',
  },
  {
    id: 'isl-004',
    question: 'Which city is the holiest in Islam?',
    options: ['Medina', 'Jerusalem', 'Makkah', 'Cairo'],
    correctIndex: 2,
    category: 'islamic',
    difficulty: 'easy',
  },
  {
    id: 'isl-005',
    question: 'What is the name of the Islamic declaration of faith?',
    options: ['Salah', 'Shahada', 'Sawm', 'Zakat'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'easy',
  },
  {
    id: 'isl-006',
    question: 'Which prophet is considered the final messenger in Islam?',
    options: ['Prophet Isa', 'Prophet Musa', 'Prophet Muhammad ﷺ', 'Prophet Ibrahim'],
    correctIndex: 2,
    category: 'islamic',
    difficulty: 'easy',
  },
  {
    id: 'isl-007',
    question: 'What direction do Muslims face when praying?',
    options: ['East', 'West', 'Toward the Kaaba', 'North'],
    correctIndex: 2,
    category: 'islamic',
    difficulty: 'easy',
  },
  {
    id: 'isl-008',
    question: 'Which prophet built the Kaaba according to Islamic tradition?',
    options: ['Prophet Musa', 'Prophet Ibrahim', 'Prophet Nuh', 'Prophet Isa'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'easy',
  },
  {
    id: 'isl-009',
    question: 'What is the obligatory charity in Islam called?',
    options: ['Sadaqah', 'Zakat', 'Waqf', 'Khums'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'easy',
  },
  {
    id: 'isl-010',
    question: 'What is the pilgrimage to Makkah called?',
    options: ['Umrah', 'Hajj', 'Jihad', 'Hijra'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'easy',
  },
  {
    id: 'isl-011',
    question: 'What is the name of the angel who revealed the Quran to Prophet Muhammad ﷺ?',
    options: ['Mikail', 'Israfil', 'Jibreel', 'Azrael'],
    correctIndex: 2,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-012',
    question: 'How many prophets are mentioned by name in the Quran?',
    options: ['20', '25', '30', '35'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-013',
    question: 'What event does the Islamic calendar (Hijri) begin from?',
    options: [
      'Birth of Prophet Muhammad ﷺ',
      'Revelation of the Quran',
      'Migration to Medina',
      'Conquest of Makkah',
    ],
    correctIndex: 2,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-014',
    question: 'Which companion of the Prophet ﷺ was the first Caliph?',
    options: ['Umar ibn al-Khattab', 'Abu Bakr al-Siddiq', 'Uthman ibn Affan', 'Ali ibn Abi Talib'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-015',
    question: 'What is the night journey of the Prophet ﷺ from Makkah to Jerusalem called?',
    options: ['Al-Miraj', 'Al-Isra', 'Al-Hijra', 'Al-Fath'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-016',
    question: 'What is the name of the well that appeared for Hajar and baby Ismail?',
    options: ['Zamzam', 'Kawthar', 'Salsabil', 'Tasnim'],
    correctIndex: 0,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-017',
    question: 'Which battle was the first major battle fought by the Muslims?',
    options: ['Battle of Uhud', 'Battle of Badr', 'Battle of Khandaq', 'Battle of Hunayn'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-018',
    question: 'What is the concept of "Tawheed" in Islam?',
    options: ['Prayer', 'Oneness of God', 'Fasting', 'Charity'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-019',
    question: 'Which month in the Islamic calendar is considered the most sacred?',
    options: ['Ramadan', 'Dhul Hijjah', 'Muharram', 'Rajab'],
    correctIndex: 2,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-020',
    question: 'What is the title given to Prophet Ibrahim in the Quran?',
    options: ['Khalilullah (Friend of Allah)', 'Ruhullah (Spirit of Allah)', 'Kalimullah (Word of Allah)', 'Habibullah (Beloved of Allah)'],
    correctIndex: 0,
    category: 'islamic',
    difficulty: 'hard',
  },
  {
    id: 'isl-021',
    question: 'Who was the first woman to accept Islam?',
    options: ['Aisha bint Abu Bakr', 'Fatimah bint Muhammad', 'Khadijah bint Khuwaylid', 'Sumayyah bint Khayyat'],
    correctIndex: 2,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-022',
    question: 'What is the Sunnah?',
    options: [
      'A chapter of the Quran',
      'The teachings and practices of Prophet Muhammad ﷺ',
      'The Islamic legal code',
      'A type of prayer',
    ],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'easy',
  },
  {
    id: 'isl-023',
    question: 'Which prophet was swallowed by a whale?',
    options: ['Prophet Ayyub', 'Prophet Yunus', 'Prophet Dawud', 'Prophet Sulayman'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'easy',
  },
  {
    id: 'isl-024',
    question: 'What is the name of the holiday that marks the end of Ramadan?',
    options: ['Eid al-Adha', 'Eid al-Fitr', 'Mawlid', 'Laylat al-Qadr'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'easy',
  },
  {
    id: 'isl-025',
    question: 'Who was the second Caliph of Islam?',
    options: ['Abu Bakr al-Siddiq', 'Umar ibn al-Khattab', 'Uthman ibn Affan', 'Ali ibn Abi Talib'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-026',
    question: 'What does "Bismillah" mean?',
    options: [
      'Praise be to God',
      'In the name of God',
      'God is the greatest',
      'Peace be upon you',
    ],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'easy',
  },
  {
    id: 'isl-027',
    question: 'How many days does the Hajj pilgrimage last?',
    options: ['3 days', '5 days', '7 days', '10 days'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-028',
    question: 'What is the first month of the Islamic calendar?',
    options: ['Ramadan', 'Muharram', 'Safar', 'Rajab'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-029',
    question: 'Which prophet is known as "Kalimullah" (the one who spoke to God)?',
    options: ['Prophet Ibrahim', 'Prophet Isa', 'Prophet Musa', 'Prophet Nuh'],
    correctIndex: 2,
    category: 'islamic',
    difficulty: 'hard',
  },
  {
    id: 'isl-030',
    question: 'What is the name of the prostration performed during Quran recitation?',
    options: ['Sujud al-Sahw', 'Sujud al-Tilawah', 'Sujud al-Shukr', 'Ruku'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'hard',
  },
  {
    id: 'isl-031',
    question: 'Which companion was known as "The Sword of Allah"?',
    options: ['Ali ibn Abi Talib', 'Hamza ibn Abdul-Muttalib', 'Khalid ibn al-Walid', 'Saad ibn Abi Waqqas'],
    correctIndex: 2,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-032',
    question: 'What does "Tawakkul" mean in Islam?',
    options: ['Repentance', 'Trust and reliance on Allah', 'Patience', 'Gratitude'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-033',
    question: 'Which prophet was given the ability to understand the language of animals?',
    options: ['Prophet Dawud', 'Prophet Sulayman', 'Prophet Idris', 'Prophet Yusuf'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-034',
    question: 'What is the concept of "Ihsan" in Islam?',
    options: [
      'Belief in Allah',
      'Performing acts of worship',
      'Excellence in worship — to worship Allah as if you see Him',
      'Giving charity',
    ],
    correctIndex: 2,
    category: 'islamic',
    difficulty: 'hard',
  },
  {
    id: 'isl-035',
    question: 'How many years did Prophet Muhammad ﷺ preach in Makkah before the Hijra?',
    options: ['8 years', '10 years', '13 years', '15 years'],
    correctIndex: 2,
    category: 'islamic',
    difficulty: 'hard',
  },
  {
    id: 'isl-036',
    question: 'What is the name of the cave where Prophet Muhammad ﷺ received the first revelation?',
    options: ['Cave of Thawr', 'Cave of Hira', 'Cave of Ashab al-Kahf', 'Cave of Uhud'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-037',
    question: 'Which prophet is the father of the Arab people according to Islamic tradition?',
    options: ['Prophet Ibrahim', 'Prophet Ismail', 'Prophet Ishaq', 'Prophet Nuh'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-038',
    question: 'What does "Alhamdulillah" mean?',
    options: ['God is the greatest', 'All praise is due to God', 'In the name of God', 'God willing'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'easy',
  },
  {
    id: 'isl-039',
    question: 'What is the night of power (Laylat al-Qadr) described as being better than?',
    options: ['A hundred nights', 'A thousand months', 'A thousand years', 'Ten thousand nights'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-040',
    question: 'Which Islamic scholar compiled the most authentic collection of Hadith?',
    options: ['Imam Malik', 'Imam Abu Hanifa', 'Imam al-Bukhari', 'Imam al-Shafi\'i'],
    correctIndex: 2,
    category: 'islamic',
    difficulty: 'hard',
  },
  {
    id: 'isl-041',
    question: 'What does "Insha\'Allah" mean?',
    options: ['God is great', 'If God wills', 'Thank God', 'May God bless you'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'easy',
  },
  {
    id: 'isl-042',
    question: 'Which Eid commemorates Prophet Ibrahim\'s willingness to sacrifice his son?',
    options: ['Eid al-Fitr', 'Eid al-Adha', 'Eid Milad un-Nabi', 'Shab-e-Barat'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'easy',
  },
  {
    id: 'isl-043',
    question: 'What is the minimum amount of wealth (Nisab) that makes Zakat obligatory based on?',
    options: ['Silver and gold', 'Land ownership', 'Annual income', 'Number of livestock'],
    correctIndex: 0,
    category: 'islamic',
    difficulty: 'hard',
  },
  {
    id: 'isl-044',
    question: 'Which prophet had a miraculous birth, born without a father?',
    options: ['Prophet Adam', 'Prophet Isa', 'Prophet Yahya', 'Prophet Idris'],
    correctIndex: 1,
    category: 'islamic',
    difficulty: 'medium',
  },
  {
    id: 'isl-045',
    question: 'What is the Islamic term for the migration of Muslims from Makkah to Medina?',
    options: ['Hijra', 'Jihad', 'Dawah', 'Ummah'],
    correctIndex: 0,
    category: 'islamic',
    difficulty: 'easy',
  },
];

// ============================================
// Question Bank — Quran & Hadith (40+)
// ============================================

const quranQuestions: TriviaQuestion[] = [
  {
    id: 'qrn-001',
    question: 'How many surahs are in the Quran?',
    options: ['112', '114', '116', '120'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'easy',
  },
  {
    id: 'qrn-002',
    question: 'In which month was the Quran first revealed?',
    options: ['Shaban', 'Ramadan', 'Muharram', 'Rajab'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'easy',
  },
  {
    id: 'qrn-003',
    question: 'What is the night of power called?',
    options: ['Laylat al-Isra', 'Laylat al-Qadr', 'Laylat al-Miraj', 'Laylat al-Bara\'ah'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'easy',
  },
  {
    id: 'qrn-004',
    question: 'Which surah is known as the heart of the Quran?',
    options: ['Al-Fatiha', 'Ya-Sin', 'Al-Baqarah', 'Al-Ikhlas'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'medium',
  },
  {
    id: 'qrn-005',
    question: 'What is the longest surah in the Quran?',
    options: ['Al-Imran', 'An-Nisa', 'Al-Baqarah', 'Al-Maida'],
    correctIndex: 2,
    category: 'quran',
    difficulty: 'easy',
  },
  {
    id: 'qrn-006',
    question: 'What is the shortest surah in the Quran?',
    options: ['Al-Ikhlas', 'Al-Kawthar', 'An-Nas', 'Al-Asr'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'medium',
  },
  {
    id: 'qrn-007',
    question: 'Which surah is recited in every unit (rakah) of prayer?',
    options: ['Al-Baqarah', 'Al-Fatiha', 'Al-Ikhlas', 'Al-Falaq'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'easy',
  },
  {
    id: 'qrn-008',
    question: 'What is the first word revealed in the Quran?',
    options: ['Bismillah', 'Iqra (Read)', 'Alhamdulillah', 'Qul (Say)'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'medium',
  },
  {
    id: 'qrn-009',
    question: 'How many juz (parts) is the Quran divided into?',
    options: ['20', '25', '30', '40'],
    correctIndex: 2,
    category: 'quran',
    difficulty: 'easy',
  },
  {
    id: 'qrn-010',
    question: 'Which surah is named after the prophet known for his patience?',
    options: ['Surah Ibrahim', 'Surah Yusuf', 'Surah Nuh', 'Surah Luqman'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'medium',
  },
  {
    id: 'qrn-011',
    question: 'Ayat al-Kursi is found in which surah?',
    options: ['Al-Imran', 'Al-Baqarah', 'An-Nisa', 'Al-Maida'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'medium',
  },
  {
    id: 'qrn-012',
    question: 'Which surah mentions the story of the People of the Cave (Ashab al-Kahf)?',
    options: ['Surah Al-Kahf', 'Surah Al-Anbiya', 'Surah Maryam', 'Surah Taha'],
    correctIndex: 0,
    category: 'quran',
    difficulty: 'easy',
  },
  {
    id: 'qrn-013',
    question: 'How many verses does Surah Al-Fatiha have?',
    options: ['5', '6', '7', '8'],
    correctIndex: 2,
    category: 'quran',
    difficulty: 'easy',
  },
  {
    id: 'qrn-014',
    question: 'Which surah is equivalent to one-third of the Quran in reward?',
    options: ['Al-Fatiha', 'Al-Kawthar', 'Al-Ikhlas', 'Al-Falaq'],
    correctIndex: 2,
    category: 'quran',
    difficulty: 'medium',
  },
  {
    id: 'qrn-015',
    question: 'Which surah was the last to be fully revealed?',
    options: ['An-Nasr', 'Al-Maida', 'At-Tawbah', 'Al-Baqarah'],
    correctIndex: 0,
    category: 'quran',
    difficulty: 'hard',
  },
  {
    id: 'qrn-016',
    question: 'What is the only surah in the Quran that does not begin with "Bismillah"?',
    options: ['Al-Baqarah', 'At-Tawbah', 'Al-Ikhlas', 'An-Nas'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'medium',
  },
  {
    id: 'qrn-017',
    question: 'Which companion was known for his beautiful recitation and memorization of the Quran?',
    options: ['Abu Bakr', 'Umar', 'Abdullah ibn Masud', 'Abu Hurairah'],
    correctIndex: 2,
    category: 'quran',
    difficulty: 'hard',
  },
  {
    id: 'qrn-018',
    question: 'In the Quran, which prophet is mentioned the most by name?',
    options: ['Prophet Muhammad ﷺ', 'Prophet Ibrahim', 'Prophet Musa', 'Prophet Isa'],
    correctIndex: 2,
    category: 'quran',
    difficulty: 'medium',
  },
  {
    id: 'qrn-019',
    question: 'Which surah is named after a woman?',
    options: ['Surah Fatimah', 'Surah Maryam', 'Surah Khadijah', 'Surah Hajar'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'easy',
  },
  {
    id: 'qrn-020',
    question: 'The verse "Surely with hardship comes ease" is found in which surah?',
    options: ['Surah Ad-Duha', 'Surah Al-Inshirah (Ash-Sharh)', 'Surah Al-Asr', 'Surah Al-Balad'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'medium',
  },
  {
    id: 'qrn-021',
    question: 'What does the word "Quran" literally mean?',
    options: ['The Holy Book', 'The Recitation', 'The Guidance', 'The Truth'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'easy',
  },
  {
    id: 'qrn-022',
    question: 'Which surah contains the verse known as the "Throne Verse" (Ayat al-Kursi)?',
    options: ['Surah Al-Baqarah, verse 255', 'Surah Al-Imran, verse 18', 'Surah An-Nisa, verse 171', 'Surah Al-Anam, verse 103'],
    correctIndex: 0,
    category: 'quran',
    difficulty: 'medium',
  },
  {
    id: 'qrn-023',
    question: 'Over how many years was the Quran revealed?',
    options: ['10 years', '15 years', '23 years', '30 years'],
    correctIndex: 2,
    category: 'quran',
    difficulty: 'medium',
  },
  {
    id: 'qrn-024',
    question: 'Which surah is referred to as "The Mother of the Book" (Umm al-Kitab)?',
    options: ['Al-Baqarah', 'Al-Fatiha', 'Ya-Sin', 'Ar-Rahman'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'medium',
  },
  {
    id: 'qrn-025',
    question: 'Which two surahs are known as "Al-Mu\'awwidhatayn" (the two protective surahs)?',
    options: ['Al-Ikhlas and An-Nas', 'Al-Falaq and An-Nas', 'Al-Fatiha and Al-Baqarah', 'Al-Kawthar and Al-Asr'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'medium',
  },
  {
    id: 'qrn-026',
    question: 'Which animal is mentioned in the name of Surah An-Naml?',
    options: ['Bee', 'Ant', 'Spider', 'Elephant'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'medium',
  },
  {
    id: 'qrn-027',
    question: 'Which Hadith collection is considered the most authentic after Sahih al-Bukhari?',
    options: ['Sunan Abu Dawud', 'Jami at-Tirmidhi', 'Sahih Muslim', 'Sunan an-Nasai'],
    correctIndex: 2,
    category: 'quran',
    difficulty: 'hard',
  },
  {
    id: 'qrn-028',
    question: 'How many times is the word "Sabr" (patience) mentioned in the Quran approximately?',
    options: ['About 30 times', 'About 70 times', 'About 90 times', 'About 120 times'],
    correctIndex: 2,
    category: 'quran',
    difficulty: 'hard',
  },
  {
    id: 'qrn-029',
    question: 'Which surah begins with "Alif Lam Mim"?',
    options: ['Al-Fatiha', 'Al-Baqarah', 'An-Nas', 'Al-Ikhlas'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'easy',
  },
  {
    id: 'qrn-030',
    question: 'What is the last surah in the Quran?',
    options: ['Al-Falaq', 'An-Nas', 'Al-Ikhlas', 'Al-Kawthar'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'easy',
  },
  {
    id: 'qrn-031',
    question: 'Which companion is credited with compiling the Quran into a single written book?',
    options: ['Ali ibn Abi Talib', 'Abu Bakr al-Siddiq', 'Uthman ibn Affan', 'Zaid ibn Thabit'],
    correctIndex: 2,
    category: 'quran',
    difficulty: 'hard',
  },
  {
    id: 'qrn-032',
    question: 'Which surah is named after "The Bee"?',
    options: ['Surah An-Naml', 'Surah An-Nahl', 'Surah Al-Ankabut', 'Surah Al-Fil'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'medium',
  },
  {
    id: 'qrn-033',
    question: 'What is the meaning of "Ar-Rahman" — one of the names of a surah?',
    options: ['The King', 'The Most Merciful', 'The All-Knowing', 'The Provider'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'easy',
  },
  {
    id: 'qrn-034',
    question: 'Which fruit is most frequently mentioned in the Quran?',
    options: ['Pomegranate', 'Date', 'Grape', 'Fig'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'hard',
  },
  {
    id: 'qrn-035',
    question: 'Which prophet\'s story takes up an entire surah in the Quran?',
    options: ['Prophet Ibrahim', 'Prophet Yusuf', 'Prophet Musa', 'Prophet Nuh'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'medium',
  },
  {
    id: 'qrn-036',
    question: 'What does "Surah Al-Asr" emphasize as essential for salvation?',
    options: [
      'Faith and good deeds alone',
      'Faith, good deeds, truth, and patience',
      'Prayer and fasting',
      'Charity and pilgrimage',
    ],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'medium',
  },
  {
    id: 'qrn-037',
    question: 'Which surah is named after "The Spider"?',
    options: ['An-Naml', 'An-Nahl', 'Al-Ankabut', 'Al-Fil'],
    correctIndex: 2,
    category: 'quran',
    difficulty: 'easy',
  },
  {
    id: 'qrn-038',
    question: 'In the Hadith, what are the "six pillars of faith" (Iman) related to?',
    options: [
      'Allah, Angels, Books, Prophets, Day of Judgment, Qadr',
      'Prayer, Fasting, Charity, Hajj, Shahada, Jihad',
      'Quran, Sunnah, Ijma, Qiyas, Ijtihad, Taqlid',
      'Heart, Tongue, Hands, Eyes, Ears, Mind',
    ],
    correctIndex: 0,
    category: 'quran',
    difficulty: 'medium',
  },
  {
    id: 'qrn-039',
    question: 'What is the approximate total number of verses (ayat) in the Quran?',
    options: ['4,000', '5,000', '6,236', '7,500'],
    correctIndex: 2,
    category: 'quran',
    difficulty: 'hard',
  },
  {
    id: 'qrn-040',
    question: 'Which surah is it recommended to recite on Fridays?',
    options: ['Surah Ya-Sin', 'Surah Al-Kahf', 'Surah Ar-Rahman', 'Surah Al-Mulk'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'easy',
  },
  {
    id: 'qrn-041',
    question: 'Which surah is named after "The Elephant"?',
    options: ['Surah Al-Fil', 'Surah Al-Baqarah', 'Surah An-Naml', 'Surah Al-Ankabut'],
    correctIndex: 0,
    category: 'quran',
    difficulty: 'easy',
  },
  {
    id: 'qrn-042',
    question: 'Which surah mentions the story of Prophet Musa and Al-Khidr?',
    options: ['Surah Taha', 'Surah Al-Kahf', 'Surah Al-Qasas', 'Surah An-Naml'],
    correctIndex: 1,
    category: 'quran',
    difficulty: 'medium',
  },
];

// ============================================
// Question Bank — World History (20+)
// ============================================

const historyQuestions: TriviaQuestion[] = [
  {
    id: 'his-001',
    question: 'In which year did World War II end?',
    options: ['1943', '1944', '1945', '1946'],
    correctIndex: 2,
    category: 'history',
    difficulty: 'easy',
  },
  {
    id: 'his-002',
    question: 'Who was the first President of the United States?',
    options: ['Thomas Jefferson', 'George Washington', 'John Adams', 'Benjamin Franklin'],
    correctIndex: 1,
    category: 'history',
    difficulty: 'easy',
  },
  {
    id: 'his-003',
    question: 'Which ancient civilization built the pyramids at Giza?',
    options: ['Roman', 'Greek', 'Egyptian', 'Mesopotamian'],
    correctIndex: 2,
    category: 'history',
    difficulty: 'easy',
  },
  {
    id: 'his-004',
    question: 'The Renaissance began in which country?',
    options: ['France', 'England', 'Italy', 'Germany'],
    correctIndex: 2,
    category: 'history',
    difficulty: 'easy',
  },
  {
    id: 'his-005',
    question: 'Who was the first Muslim ruler to conquer Constantinople (Istanbul)?',
    options: ['Salahuddin Ayyubi', 'Sultan Mehmed II', 'Suleiman the Magnificent', 'Harun al-Rashid'],
    correctIndex: 1,
    category: 'history',
    difficulty: 'medium',
  },
  {
    id: 'his-006',
    question: 'Which empire was the largest contiguous land empire in history?',
    options: ['Roman Empire', 'Ottoman Empire', 'British Empire', 'Mongol Empire'],
    correctIndex: 3,
    category: 'history',
    difficulty: 'medium',
  },
  {
    id: 'his-007',
    question: 'The Berlin Wall fell in which year?',
    options: ['1987', '1988', '1989', '1990'],
    correctIndex: 2,
    category: 'history',
    difficulty: 'easy',
  },
  {
    id: 'his-008',
    question: 'Who wrote the Declaration of Independence?',
    options: ['George Washington', 'Benjamin Franklin', 'Thomas Jefferson', 'John Adams'],
    correctIndex: 2,
    category: 'history',
    difficulty: 'easy',
  },
  {
    id: 'his-009',
    question: 'Which dynasty founded the city of Baghdad?',
    options: ['Umayyad', 'Abbasid', 'Ottoman', 'Fatimid'],
    correctIndex: 1,
    category: 'history',
    difficulty: 'medium',
  },
  {
    id: 'his-010',
    question: 'What was the name of the trade route connecting China to the Mediterranean?',
    options: ['Spice Route', 'Silk Road', 'Amber Road', 'Incense Route'],
    correctIndex: 1,
    category: 'history',
    difficulty: 'easy',
  },
  {
    id: 'his-011',
    question: 'Which ancient wonder was located in Alexandria, Egypt?',
    options: ['Colossus of Rhodes', 'Hanging Gardens', 'Lighthouse of Alexandria', 'Temple of Artemis'],
    correctIndex: 2,
    category: 'history',
    difficulty: 'medium',
  },
  {
    id: 'his-012',
    question: 'The Ottoman Empire was officially dissolved in which year?',
    options: ['1918', '1920', '1922', '1924'],
    correctIndex: 2,
    category: 'history',
    difficulty: 'hard',
  },
  {
    id: 'his-013',
    question: 'Who was the leader of the Mongol Empire at its founding?',
    options: ['Kublai Khan', 'Timur', 'Genghis Khan', 'Ogedei Khan'],
    correctIndex: 2,
    category: 'history',
    difficulty: 'easy',
  },
  {
    id: 'his-014',
    question: 'Which Muslim scientist is known as the "Father of Algebra"?',
    options: ['Ibn Sina', 'Al-Khwarizmi', 'Al-Biruni', 'Ibn al-Haytham'],
    correctIndex: 1,
    category: 'history',
    difficulty: 'medium',
  },
  {
    id: 'his-015',
    question: 'The French Revolution began in which year?',
    options: ['1776', '1789', '1799', '1804'],
    correctIndex: 1,
    category: 'history',
    difficulty: 'medium',
  },
  {
    id: 'his-016',
    question: 'Who was Salahuddin al-Ayyubi (Saladin) known for recapturing?',
    options: ['Constantinople', 'Baghdad', 'Jerusalem', 'Damascus'],
    correctIndex: 2,
    category: 'history',
    difficulty: 'medium',
  },
  {
    id: 'his-017',
    question: 'Which civilization invented the first known writing system (cuneiform)?',
    options: ['Egyptian', 'Sumerian', 'Chinese', 'Indus Valley'],
    correctIndex: 1,
    category: 'history',
    difficulty: 'medium',
  },
  {
    id: 'his-018',
    question: 'Nelson Mandela was imprisoned for how many years?',
    options: ['18 years', '22 years', '27 years', '30 years'],
    correctIndex: 2,
    category: 'history',
    difficulty: 'medium',
  },
  {
    id: 'his-019',
    question: 'Which explorer is credited with the first circumnavigation of the Earth?',
    options: ['Christopher Columbus', 'Vasco da Gama', 'Ferdinand Magellan\'s expedition', 'James Cook'],
    correctIndex: 2,
    category: 'history',
    difficulty: 'medium',
  },
  {
    id: 'his-020',
    question: 'The Golden Age of Islam is primarily associated with which centuries?',
    options: ['5th–7th centuries', '8th–14th centuries', '15th–17th centuries', '18th–19th centuries'],
    correctIndex: 1,
    category: 'history',
    difficulty: 'medium',
  },
  {
    id: 'his-021',
    question: 'Who was the first person to set foot on the Moon?',
    options: ['Buzz Aldrin', 'Yuri Gagarin', 'Neil Armstrong', 'Michael Collins'],
    correctIndex: 2,
    category: 'history',
    difficulty: 'easy',
  },
  {
    id: 'his-022',
    question: 'Which treaty ended World War I?',
    options: ['Treaty of Paris', 'Treaty of Versailles', 'Treaty of Westphalia', 'Treaty of Tordesillas'],
    correctIndex: 1,
    category: 'history',
    difficulty: 'medium',
  },
];

// ============================================
// Question Bank — Science & Nature (20+)
// ============================================

const scienceQuestions: TriviaQuestion[] = [
  {
    id: 'sci-001',
    question: 'What is the chemical symbol for water?',
    options: ['HO', 'H2O', 'O2H', 'OH2'],
    correctIndex: 1,
    category: 'science',
    difficulty: 'easy',
  },
  {
    id: 'sci-002',
    question: 'What planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctIndex: 1,
    category: 'science',
    difficulty: 'easy',
  },
  {
    id: 'sci-003',
    question: 'How many bones are in the adult human body?',
    options: ['186', '196', '206', '216'],
    correctIndex: 2,
    category: 'science',
    difficulty: 'easy',
  },
  {
    id: 'sci-004',
    question: 'What is the largest organ in the human body?',
    options: ['Liver', 'Brain', 'Skin', 'Heart'],
    correctIndex: 2,
    category: 'science',
    difficulty: 'easy',
  },
  {
    id: 'sci-005',
    question: 'What gas do plants absorb from the atmosphere during photosynthesis?',
    options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'],
    correctIndex: 2,
    category: 'science',
    difficulty: 'easy',
  },
  {
    id: 'sci-006',
    question: 'What is the speed of light in a vacuum (approximately)?',
    options: ['150,000 km/s', '200,000 km/s', '300,000 km/s', '400,000 km/s'],
    correctIndex: 2,
    category: 'science',
    difficulty: 'medium',
  },
  {
    id: 'sci-007',
    question: 'Which element has the atomic number 1?',
    options: ['Helium', 'Hydrogen', 'Lithium', 'Carbon'],
    correctIndex: 1,
    category: 'science',
    difficulty: 'easy',
  },
  {
    id: 'sci-008',
    question: 'What is the powerhouse of the cell?',
    options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Endoplasmic Reticulum'],
    correctIndex: 2,
    category: 'science',
    difficulty: 'easy',
  },
  {
    id: 'sci-009',
    question: 'What is the closest star to Earth (other than the Sun)?',
    options: ['Sirius', 'Alpha Centauri', 'Proxima Centauri', 'Betelgeuse'],
    correctIndex: 2,
    category: 'science',
    difficulty: 'medium',
  },
  {
    id: 'sci-010',
    question: 'What type of animal is a dolphin?',
    options: ['Fish', 'Reptile', 'Mammal', 'Amphibian'],
    correctIndex: 2,
    category: 'science',
    difficulty: 'easy',
  },
  {
    id: 'sci-011',
    question: 'What force keeps planets in orbit around the Sun?',
    options: ['Electromagnetic force', 'Gravity', 'Nuclear force', 'Friction'],
    correctIndex: 1,
    category: 'science',
    difficulty: 'easy',
  },
  {
    id: 'sci-012',
    question: 'What is the most abundant gas in Earth\'s atmosphere?',
    options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Argon'],
    correctIndex: 2,
    category: 'science',
    difficulty: 'medium',
  },
  {
    id: 'sci-013',
    question: 'Who proposed the theory of general relativity?',
    options: ['Isaac Newton', 'Albert Einstein', 'Niels Bohr', 'Max Planck'],
    correctIndex: 1,
    category: 'science',
    difficulty: 'easy',
  },
  {
    id: 'sci-014',
    question: 'What is the hardest natural substance on Earth?',
    options: ['Gold', 'Iron', 'Diamond', 'Quartz'],
    correctIndex: 2,
    category: 'science',
    difficulty: 'easy',
  },
  {
    id: 'sci-015',
    question: 'How many chromosomes do humans have?',
    options: ['23', '44', '46', '48'],
    correctIndex: 2,
    category: 'science',
    difficulty: 'medium',
  },
  {
    id: 'sci-016',
    question: 'What is the process by which a liquid turns into a gas called?',
    options: ['Condensation', 'Evaporation', 'Sublimation', 'Precipitation'],
    correctIndex: 1,
    category: 'science',
    difficulty: 'easy',
  },
  {
    id: 'sci-017',
    question: 'Which scientist is known as the "Father of Optics"?',
    options: ['Galileo Galilei', 'Ibn al-Haytham', 'Isaac Newton', 'Robert Hooke'],
    correctIndex: 1,
    category: 'science',
    difficulty: 'hard',
  },
  {
    id: 'sci-018',
    question: 'What is the largest planet in our solar system?',
    options: ['Saturn', 'Neptune', 'Jupiter', 'Uranus'],
    correctIndex: 2,
    category: 'science',
    difficulty: 'easy',
  },
  {
    id: 'sci-019',
    question: 'What part of the plant conducts photosynthesis?',
    options: ['Roots', 'Stem', 'Leaves', 'Flowers'],
    correctIndex: 2,
    category: 'science',
    difficulty: 'easy',
  },
  {
    id: 'sci-020',
    question: 'What is the chemical formula for table salt?',
    options: ['NaCl', 'KCl', 'CaCl2', 'NaOH'],
    correctIndex: 0,
    category: 'science',
    difficulty: 'medium',
  },
  {
    id: 'sci-021',
    question: 'How long does it take light from the Sun to reach Earth?',
    options: ['About 4 minutes', 'About 8 minutes', 'About 15 minutes', 'About 30 minutes'],
    correctIndex: 1,
    category: 'science',
    difficulty: 'medium',
  },
  {
    id: 'sci-022',
    question: 'What is the study of earthquakes called?',
    options: ['Meteorology', 'Seismology', 'Volcanology', 'Geology'],
    correctIndex: 1,
    category: 'science',
    difficulty: 'medium',
  },
];

// ============================================
// Question Bank — Geography (20+)
// ============================================

const geographyQuestions: TriviaQuestion[] = [
  {
    id: 'geo-001',
    question: 'What is the largest continent by area?',
    options: ['Africa', 'North America', 'Asia', 'Europe'],
    correctIndex: 2,
    category: 'geography',
    difficulty: 'easy',
  },
  {
    id: 'geo-002',
    question: 'Which river is the longest in the world?',
    options: ['Amazon', 'Nile', 'Mississippi', 'Yangtze'],
    correctIndex: 1,
    category: 'geography',
    difficulty: 'easy',
  },
  {
    id: 'geo-003',
    question: 'What is the capital of Australia?',
    options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'],
    correctIndex: 2,
    category: 'geography',
    difficulty: 'medium',
  },
  {
    id: 'geo-004',
    question: 'Which country has the most population in the world?',
    options: ['China', 'India', 'United States', 'Indonesia'],
    correctIndex: 1,
    category: 'geography',
    difficulty: 'easy',
  },
  {
    id: 'geo-005',
    question: 'What is the smallest country in the world by area?',
    options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'],
    correctIndex: 1,
    category: 'geography',
    difficulty: 'medium',
  },
  {
    id: 'geo-006',
    question: 'Mount Everest is located on the border of which two countries?',
    options: ['India and China', 'Nepal and China', 'Nepal and India', 'Bhutan and China'],
    correctIndex: 1,
    category: 'geography',
    difficulty: 'medium',
  },
  {
    id: 'geo-007',
    question: 'What is the largest desert in the world?',
    options: ['Sahara', 'Arabian', 'Gobi', 'Antarctic'],
    correctIndex: 3,
    category: 'geography',
    difficulty: 'hard',
  },
  {
    id: 'geo-008',
    question: 'Which ocean is the largest?',
    options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'],
    correctIndex: 2,
    category: 'geography',
    difficulty: 'easy',
  },
  {
    id: 'geo-009',
    question: 'What is the capital of Turkey?',
    options: ['Istanbul', 'Ankara', 'Izmir', 'Bursa'],
    correctIndex: 1,
    category: 'geography',
    difficulty: 'medium',
  },
  {
    id: 'geo-010',
    question: 'Which African country is the most populous?',
    options: ['Egypt', 'South Africa', 'Nigeria', 'Ethiopia'],
    correctIndex: 2,
    category: 'geography',
    difficulty: 'medium',
  },
  {
    id: 'geo-011',
    question: 'The Great Barrier Reef is located off the coast of which country?',
    options: ['New Zealand', 'Indonesia', 'Australia', 'Philippines'],
    correctIndex: 2,
    category: 'geography',
    difficulty: 'easy',
  },
  {
    id: 'geo-012',
    question: 'What is the capital of Saudi Arabia?',
    options: ['Jeddah', 'Makkah', 'Riyadh', 'Medina'],
    correctIndex: 2,
    category: 'geography',
    difficulty: 'easy',
  },
  {
    id: 'geo-013',
    question: 'Which country is both in Europe and Asia?',
    options: ['Russia', 'Turkey', 'Egypt', 'Both Russia and Turkey'],
    correctIndex: 3,
    category: 'geography',
    difficulty: 'medium',
  },
  {
    id: 'geo-014',
    question: 'What is the longest mountain range in the world?',
    options: ['Himalayas', 'Rocky Mountains', 'Andes', 'Alps'],
    correctIndex: 2,
    category: 'geography',
    difficulty: 'medium',
  },
  {
    id: 'geo-015',
    question: 'Which country has the most time zones?',
    options: ['Russia', 'United States', 'France', 'China'],
    correctIndex: 2,
    category: 'geography',
    difficulty: 'hard',
  },
  {
    id: 'geo-016',
    question: 'What is the deepest point in the ocean?',
    options: ['Tonga Trench', 'Mariana Trench', 'Puerto Rico Trench', 'Java Trench'],
    correctIndex: 1,
    category: 'geography',
    difficulty: 'medium',
  },
  {
    id: 'geo-017',
    question: 'Which country is known as the "Land of the Rising Sun"?',
    options: ['China', 'South Korea', 'Japan', 'Thailand'],
    correctIndex: 2,
    category: 'geography',
    difficulty: 'easy',
  },
  {
    id: 'geo-018',
    question: 'What is the capital of Morocco?',
    options: ['Casablanca', 'Marrakech', 'Rabat', 'Fez'],
    correctIndex: 2,
    category: 'geography',
    difficulty: 'medium',
  },
  {
    id: 'geo-019',
    question: 'Which strait separates Europe from Asia?',
    options: ['Strait of Gibraltar', 'Strait of Hormuz', 'Bosphorus Strait', 'Strait of Malacca'],
    correctIndex: 2,
    category: 'geography',
    difficulty: 'medium',
  },
  {
    id: 'geo-020',
    question: 'What is the largest country by area?',
    options: ['Canada', 'China', 'United States', 'Russia'],
    correctIndex: 3,
    category: 'geography',
    difficulty: 'easy',
  },
  {
    id: 'geo-021',
    question: 'Which lake is the largest freshwater lake by surface area?',
    options: ['Lake Victoria', 'Lake Superior', 'Lake Baikal', 'Caspian Sea'],
    correctIndex: 1,
    category: 'geography',
    difficulty: 'hard',
  },
  {
    id: 'geo-022',
    question: 'What is the capital of Egypt?',
    options: ['Alexandria', 'Cairo', 'Luxor', 'Giza'],
    correctIndex: 1,
    category: 'geography',
    difficulty: 'easy',
  },
];

// ============================================
// Question Bank — Pop Culture (20+)
// ============================================

const popCultureQuestions: TriviaQuestion[] = [
  {
    id: 'pop-001',
    question: 'Which movie franchise features a character named "Luke Skywalker"?',
    options: ['Star Trek', 'Star Wars', 'Guardians of the Galaxy', 'The Matrix'],
    correctIndex: 1,
    category: 'pop_culture',
    difficulty: 'easy',
  },
  {
    id: 'pop-002',
    question: 'What is the name of the fictional school in Harry Potter?',
    options: ['Beauxbatons', 'Durmstrang', 'Hogwarts', 'Ilvermorny'],
    correctIndex: 2,
    category: 'pop_culture',
    difficulty: 'easy',
  },
  {
    id: 'pop-003',
    question: 'Which band performed "Bohemian Rhapsody"?',
    options: ['The Beatles', 'Led Zeppelin', 'Queen', 'Pink Floyd'],
    correctIndex: 2,
    category: 'pop_culture',
    difficulty: 'easy',
  },
  {
    id: 'pop-004',
    question: 'What is the highest-grossing film of all time (unadjusted for inflation)?',
    options: ['Avengers: Endgame', 'Avatar', 'Titanic', 'Star Wars: The Force Awakens'],
    correctIndex: 1,
    category: 'pop_culture',
    difficulty: 'medium',
  },
  {
    id: 'pop-005',
    question: 'Which TV show features the fictional continent of Westeros?',
    options: ['The Witcher', 'Lord of the Rings', 'Game of Thrones', 'Wheel of Time'],
    correctIndex: 2,
    category: 'pop_culture',
    difficulty: 'easy',
  },
  {
    id: 'pop-006',
    question: 'Who played Iron Man in the Marvel Cinematic Universe?',
    options: ['Chris Evans', 'Robert Downey Jr.', 'Chris Hemsworth', 'Mark Ruffalo'],
    correctIndex: 1,
    category: 'pop_culture',
    difficulty: 'easy',
  },
  {
    id: 'pop-007',
    question: 'What year was the first iPhone released?',
    options: ['2005', '2006', '2007', '2008'],
    correctIndex: 2,
    category: 'pop_culture',
    difficulty: 'medium',
  },
  {
    id: 'pop-008',
    question: 'Which video game character is known for collecting gold rings?',
    options: ['Mario', 'Sonic the Hedgehog', 'Pac-Man', 'Donkey Kong'],
    correctIndex: 1,
    category: 'pop_culture',
    difficulty: 'easy',
  },
  {
    id: 'pop-009',
    question: 'Which Disney movie features a character named Simba?',
    options: ['Aladdin', 'The Jungle Book', 'The Lion King', 'Moana'],
    correctIndex: 2,
    category: 'pop_culture',
    difficulty: 'easy',
  },
  {
    id: 'pop-010',
    question: 'What is the name of the fictional metal in the Marvel Universe that Captain America\'s shield is made of?',
    options: ['Adamantium', 'Vibranium', 'Uru', 'Carbonadium'],
    correctIndex: 1,
    category: 'pop_culture',
    difficulty: 'medium',
  },
  {
    id: 'pop-011',
    question: 'Which artist released the album "Thriller"?',
    options: ['Prince', 'Michael Jackson', 'Whitney Houston', 'Stevie Wonder'],
    correctIndex: 1,
    category: 'pop_culture',
    difficulty: 'easy',
  },
  {
    id: 'pop-012',
    question: 'In the movie "The Matrix," what color pill does Neo take?',
    options: ['Blue', 'Red', 'Green', 'Yellow'],
    correctIndex: 1,
    category: 'pop_culture',
    difficulty: 'easy',
  },
  {
    id: 'pop-013',
    question: 'Which streaming service produced "Squid Game"?',
    options: ['Amazon Prime', 'Disney+', 'Netflix', 'HBO Max'],
    correctIndex: 2,
    category: 'pop_culture',
    difficulty: 'easy',
  },
  {
    id: 'pop-014',
    question: 'What is the name of the wizard played by Ian McKellen in "Lord of the Rings"?',
    options: ['Saruman', 'Dumbledore', 'Gandalf', 'Radagast'],
    correctIndex: 2,
    category: 'pop_culture',
    difficulty: 'easy',
  },
  {
    id: 'pop-015',
    question: 'Which animated movie features a robot named WALL-E?',
    options: ['Big Hero 6', 'WALL-E', 'Robots', 'The Iron Giant'],
    correctIndex: 1,
    category: 'pop_culture',
    difficulty: 'easy',
  },
  {
    id: 'pop-016',
    question: 'Who created the social media platform Facebook?',
    options: ['Jack Dorsey', 'Elon Musk', 'Mark Zuckerberg', 'Steve Jobs'],
    correctIndex: 2,
    category: 'pop_culture',
    difficulty: 'easy',
  },
  {
    id: 'pop-017',
    question: 'Which K-pop group released the hit song "Dynamite"?',
    options: ['BLACKPINK', 'EXO', 'BTS', 'TWICE'],
    correctIndex: 2,
    category: 'pop_culture',
    difficulty: 'easy',
  },
  {
    id: 'pop-018',
    question: 'In which fictional city does Batman operate?',
    options: ['Metropolis', 'Star City', 'Gotham City', 'Central City'],
    correctIndex: 2,
    category: 'pop_culture',
    difficulty: 'easy',
  },
  {
    id: 'pop-019',
    question: 'Which Pixar movie is set in the world of emotions inside a girl\'s mind?',
    options: ['Soul', 'Inside Out', 'Coco', 'Up'],
    correctIndex: 1,
    category: 'pop_culture',
    difficulty: 'easy',
  },
  {
    id: 'pop-020',
    question: 'What was the first feature-length animated film ever released?',
    options: ['Bambi', 'Fantasia', 'Snow White and the Seven Dwarfs', 'Pinocchio'],
    correctIndex: 2,
    category: 'pop_culture',
    difficulty: 'medium',
  },
  {
    id: 'pop-021',
    question: 'Which video game series features a character named "Link" in the kingdom of Hyrule?',
    options: ['Final Fantasy', 'The Legend of Zelda', 'Fire Emblem', 'Dragon Quest'],
    correctIndex: 1,
    category: 'pop_culture',
    difficulty: 'easy',
  },
];

// ============================================
// Question Bank — Sports (20+)
// ============================================

const sportsQuestions: TriviaQuestion[] = [
  {
    id: 'spt-001',
    question: 'Which country has won the most FIFA World Cup titles?',
    options: ['Germany', 'Argentina', 'Brazil', 'Italy'],
    correctIndex: 2,
    category: 'sports',
    difficulty: 'easy',
  },
  {
    id: 'spt-002',
    question: 'How many players are on a standard soccer (football) team on the field?',
    options: ['9', '10', '11', '12'],
    correctIndex: 2,
    category: 'sports',
    difficulty: 'easy',
  },
  {
    id: 'spt-003',
    question: 'In which sport would you perform a "slam dunk"?',
    options: ['Volleyball', 'Tennis', 'Basketball', 'Handball'],
    correctIndex: 2,
    category: 'sports',
    difficulty: 'easy',
  },
  {
    id: 'spt-004',
    question: 'Where were the first modern Olympic Games held?',
    options: ['Paris', 'London', 'Athens', 'Rome'],
    correctIndex: 2,
    category: 'sports',
    difficulty: 'medium',
  },
  {
    id: 'spt-005',
    question: 'Which tennis tournament is played on grass courts?',
    options: ['US Open', 'French Open', 'Australian Open', 'Wimbledon'],
    correctIndex: 3,
    category: 'sports',
    difficulty: 'easy',
  },
  {
    id: 'spt-006',
    question: 'Who holds the record for the most goals scored in international football (men\'s)?',
    options: ['Lionel Messi', 'Cristiano Ronaldo', 'Pelé', 'Ali Daei'],
    correctIndex: 1,
    category: 'sports',
    difficulty: 'medium',
  },
  {
    id: 'spt-007',
    question: 'In cricket, how many runs is a "century"?',
    options: ['50', '100', '150', '200'],
    correctIndex: 1,
    category: 'sports',
    difficulty: 'easy',
  },
  {
    id: 'spt-008',
    question: 'Which country invented the sport of basketball?',
    options: ['Canada', 'United States', 'England', 'France'],
    correctIndex: 1,
    category: 'sports',
    difficulty: 'medium',
  },
  {
    id: 'spt-009',
    question: 'What is the diameter of a basketball hoop in inches?',
    options: ['16 inches', '18 inches', '20 inches', '22 inches'],
    correctIndex: 1,
    category: 'sports',
    difficulty: 'hard',
  },
  {
    id: 'spt-010',
    question: 'Which martial art originated in Japan and means "the way of the empty hand"?',
    options: ['Judo', 'Taekwondo', 'Karate', 'Kung Fu'],
    correctIndex: 2,
    category: 'sports',
    difficulty: 'medium',
  },
  {
    id: 'spt-011',
    question: 'How long is a marathon in miles (approximately)?',
    options: ['24.2 miles', '25.2 miles', '26.2 miles', '27.2 miles'],
    correctIndex: 2,
    category: 'sports',
    difficulty: 'easy',
  },
  {
    id: 'spt-012',
    question: 'Which country hosted the 2022 FIFA World Cup?',
    options: ['Russia', 'Qatar', 'Saudi Arabia', 'United Arab Emirates'],
    correctIndex: 1,
    category: 'sports',
    difficulty: 'easy',
  },
  {
    id: 'spt-013',
    question: 'In which sport is the term "love" used to mean zero?',
    options: ['Badminton', 'Table Tennis', 'Tennis', 'Squash'],
    correctIndex: 2,
    category: 'sports',
    difficulty: 'easy',
  },
  {
    id: 'spt-014',
    question: 'Who is known as "The Greatest" in boxing?',
    options: ['Mike Tyson', 'Floyd Mayweather', 'Muhammad Ali', 'Manny Pacquiao'],
    correctIndex: 2,
    category: 'sports',
    difficulty: 'easy',
  },
  {
    id: 'spt-015',
    question: 'Which sport uses the terms "birdie" and "eagle"?',
    options: ['Tennis', 'Golf', 'Badminton', 'Cricket'],
    correctIndex: 1,
    category: 'sports',
    difficulty: 'easy',
  },
  {
    id: 'spt-016',
    question: 'In which Olympic sport do athletes use a foil, épée, or sabre?',
    options: ['Archery', 'Fencing', 'Javelin', 'Shooting'],
    correctIndex: 1,
    category: 'sports',
    difficulty: 'medium',
  },
  {
    id: 'spt-017',
    question: 'Which NBA player is known by the nickname "King James"?',
    options: ['Michael Jordan', 'Kobe Bryant', 'LeBron James', 'Stephen Curry'],
    correctIndex: 2,
    category: 'sports',
    difficulty: 'easy',
  },
  {
    id: 'spt-018',
    question: 'How many points is a touchdown worth in American football?',
    options: ['3', '5', '6', '7'],
    correctIndex: 2,
    category: 'sports',
    difficulty: 'easy',
  },
  {
    id: 'spt-019',
    question: 'Which country is famous for originating the sport of sumo wrestling?',
    options: ['China', 'South Korea', 'Japan', 'Mongolia'],
    correctIndex: 2,
    category: 'sports',
    difficulty: 'easy',
  },
  {
    id: 'spt-020',
    question: 'In swimming, which stroke is the fastest?',
    options: ['Backstroke', 'Breaststroke', 'Butterfly', 'Freestyle (Front Crawl)'],
    correctIndex: 3,
    category: 'sports',
    difficulty: 'medium',
  },
  {
    id: 'spt-021',
    question: 'Which footballer is known as "The Egyptian King"?',
    options: ['Amr Zaki', 'Mohamed Salah', 'Ahmed Hassan', 'Mohamed Aboutrika'],
    correctIndex: 1,
    category: 'sports',
    difficulty: 'easy',
  },
];

// ============================================
// Question Bank — Food & Cuisine (20+)
// ============================================

const foodQuestions: TriviaQuestion[] = [
  {
    id: 'fod-001',
    question: 'Which country is the origin of sushi?',
    options: ['China', 'South Korea', 'Japan', 'Thailand'],
    correctIndex: 2,
    category: 'food',
    difficulty: 'easy',
  },
  {
    id: 'fod-002',
    question: 'What is the main ingredient in hummus?',
    options: ['Lentils', 'Chickpeas', 'Black beans', 'Fava beans'],
    correctIndex: 1,
    category: 'food',
    difficulty: 'easy',
  },
  {
    id: 'fod-003',
    question: 'Which spice is known as "red gold" and is the most expensive by weight?',
    options: ['Vanilla', 'Cardamom', 'Saffron', 'Turmeric'],
    correctIndex: 2,
    category: 'food',
    difficulty: 'medium',
  },
  {
    id: 'fod-004',
    question: 'What type of pasta is shaped like small tubes?',
    options: ['Spaghetti', 'Penne', 'Linguine', 'Fettuccine'],
    correctIndex: 1,
    category: 'food',
    difficulty: 'easy',
  },
  {
    id: 'fod-005',
    question: 'Which fruit is known as the "king of fruits" in Southeast Asia?',
    options: ['Mango', 'Jackfruit', 'Durian', 'Rambutan'],
    correctIndex: 2,
    category: 'food',
    difficulty: 'medium',
  },
  {
    id: 'fod-006',
    question: 'Kimchi is a traditional fermented dish from which country?',
    options: ['Japan', 'China', 'South Korea', 'Vietnam'],
    correctIndex: 2,
    category: 'food',
    difficulty: 'easy',
  },
  {
    id: 'fod-007',
    question: 'What is the main ingredient in guacamole?',
    options: ['Tomato', 'Avocado', 'Lime', 'Cilantro'],
    correctIndex: 1,
    category: 'food',
    difficulty: 'easy',
  },
  {
    id: 'fod-008',
    question: 'Which country is famous for originating croissants?',
    options: ['France', 'Austria', 'Italy', 'Belgium'],
    correctIndex: 1,
    category: 'food',
    difficulty: 'hard',
  },
  {
    id: 'fod-009',
    question: 'What is "halal" food?',
    options: [
      'Vegetarian food',
      'Food permissible under Islamic law',
      'Organic food',
      'Kosher food',
    ],
    correctIndex: 1,
    category: 'food',
    difficulty: 'easy',
  },
  {
    id: 'fod-010',
    question: 'Which nut is used to make marzipan?',
    options: ['Walnut', 'Pistachio', 'Almond', 'Cashew'],
    correctIndex: 2,
    category: 'food',
    difficulty: 'medium',
  },
  {
    id: 'fod-011',
    question: 'Biryani is a popular rice dish originating from which region?',
    options: ['East Asia', 'South Asia', 'Middle East', 'North Africa'],
    correctIndex: 1,
    category: 'food',
    difficulty: 'easy',
  },
  {
    id: 'fod-012',
    question: 'What is the traditional Japanese soup made from fermented soybean paste?',
    options: ['Ramen', 'Miso soup', 'Tom Yum', 'Pho'],
    correctIndex: 1,
    category: 'food',
    difficulty: 'easy',
  },
  {
    id: 'fod-013',
    question: 'Which country is the largest producer of coffee beans?',
    options: ['Colombia', 'Ethiopia', 'Vietnam', 'Brazil'],
    correctIndex: 3,
    category: 'food',
    difficulty: 'medium',
  },
  {
    id: 'fod-014',
    question: 'What does "al dente" mean when cooking pasta?',
    options: ['Overcooked', 'Firm to the bite', 'Soft and mushy', 'Deep fried'],
    correctIndex: 1,
    category: 'food',
    difficulty: 'easy',
  },
  {
    id: 'fod-015',
    question: 'Falafel is a deep-fried ball traditionally made from which ingredients?',
    options: ['Potatoes', 'Chickpeas or fava beans', 'Rice', 'Lentils'],
    correctIndex: 1,
    category: 'food',
    difficulty: 'easy',
  },
  {
    id: 'fod-016',
    question: 'Which vitamin is abundantly found in oranges?',
    options: ['Vitamin A', 'Vitamin B', 'Vitamin C', 'Vitamin D'],
    correctIndex: 2,
    category: 'food',
    difficulty: 'easy',
  },
  {
    id: 'fod-017',
    question: 'What type of milk is traditionally used to make Indian paneer?',
    options: ['Goat milk', 'Buffalo milk or cow milk', 'Soy milk', 'Coconut milk'],
    correctIndex: 1,
    category: 'food',
    difficulty: 'medium',
  },
  {
    id: 'fod-018',
    question: 'Which country is the origin of the dish "paella"?',
    options: ['Mexico', 'Italy', 'Spain', 'Portugal'],
    correctIndex: 2,
    category: 'food',
    difficulty: 'easy',
  },
  {
    id: 'fod-019',
    question: 'What is the most consumed food in the world?',
    options: ['Wheat', 'Rice', 'Corn', 'Potatoes'],
    correctIndex: 1,
    category: 'food',
    difficulty: 'medium',
  },
  {
    id: 'fod-020',
    question: 'Turkish delight (lokum) is traditionally flavored with which flower water?',
    options: ['Lavender', 'Rose', 'Jasmine', 'Orange blossom'],
    correctIndex: 1,
    category: 'food',
    difficulty: 'medium',
  },
  {
    id: 'fod-021',
    question: 'What is the main ingredient in traditional tahini?',
    options: ['Peanuts', 'Sesame seeds', 'Sunflower seeds', 'Almonds'],
    correctIndex: 1,
    category: 'food',
    difficulty: 'easy',
  },
];

// ============================================
// Question Bank — Technology (20+)
// ============================================

const technologyQuestions: TriviaQuestion[] = [
  {
    id: 'tch-001',
    question: 'What does "HTML" stand for?',
    options: [
      'HyperText Markup Language',
      'High-Tech Modern Language',
      'HyperText Machine Language',
      'Home Tool Markup Language',
    ],
    correctIndex: 0,
    category: 'technology',
    difficulty: 'easy',
  },
  {
    id: 'tch-002',
    question: 'Who is considered the father of the computer?',
    options: ['Alan Turing', 'Charles Babbage', 'Steve Jobs', 'Bill Gates'],
    correctIndex: 1,
    category: 'technology',
    difficulty: 'medium',
  },
  {
    id: 'tch-003',
    question: 'What does "CPU" stand for?',
    options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Core Processing Unit'],
    correctIndex: 0,
    category: 'technology',
    difficulty: 'easy',
  },
  {
    id: 'tch-004',
    question: 'Which company created the Android operating system?',
    options: ['Apple', 'Microsoft', 'Google', 'Samsung'],
    correctIndex: 2,
    category: 'technology',
    difficulty: 'easy',
  },
  {
    id: 'tch-005',
    question: 'What does "Wi-Fi" stand for?',
    options: ['Wireless Fidelity', 'Wireless Frequency', 'Wide Fidelity', 'It\'s a brand name, not an acronym'],
    correctIndex: 3,
    category: 'technology',
    difficulty: 'hard',
  },
  {
    id: 'tch-006',
    question: 'In what year was the World Wide Web invented?',
    options: ['1985', '1989', '1993', '1995'],
    correctIndex: 1,
    category: 'technology',
    difficulty: 'medium',
  },
  {
    id: 'tch-007',
    question: 'What programming language was created by James Gosling at Sun Microsystems?',
    options: ['Python', 'C++', 'Java', 'JavaScript'],
    correctIndex: 2,
    category: 'technology',
    difficulty: 'medium',
  },
  {
    id: 'tch-008',
    question: 'What does "AI" stand for in the context of technology?',
    options: ['Automated Intelligence', 'Artificial Intelligence', 'Advanced Interface', 'Applied Integration'],
    correctIndex: 1,
    category: 'technology',
    difficulty: 'easy',
  },
  {
    id: 'tch-009',
    question: 'Which company was co-founded by Steve Jobs, Steve Wozniak, and Ronald Wayne?',
    options: ['Microsoft', 'IBM', 'Apple', 'Dell'],
    correctIndex: 2,
    category: 'technology',
    difficulty: 'easy',
  },
  {
    id: 'tch-010',
    question: 'What is the binary representation of the decimal number 10?',
    options: ['1000', '1010', '1100', '1001'],
    correctIndex: 1,
    category: 'technology',
    difficulty: 'medium',
  },
  {
    id: 'tch-011',
    question: 'What does "USB" stand for?',
    options: ['Universal Serial Bus', 'United System Board', 'Universal System Backup', 'Unified Serial Bus'],
    correctIndex: 0,
    category: 'technology',
    difficulty: 'easy',
  },
  {
    id: 'tch-012',
    question: 'Which company developed the first commercially successful smartphone?',
    options: ['Apple', 'Nokia', 'BlackBerry (RIM)', 'Samsung'],
    correctIndex: 2,
    category: 'technology',
    difficulty: 'medium',
  },
  {
    id: 'tch-013',
    question: 'What does "IoT" stand for?',
    options: ['Internet of Things', 'Integration of Technology', 'Internet of Tools', 'Input/Output Terminal'],
    correctIndex: 0,
    category: 'technology',
    difficulty: 'easy',
  },
  {
    id: 'tch-014',
    question: 'Who invented the World Wide Web?',
    options: ['Vint Cerf', 'Tim Berners-Lee', 'Larry Page', 'Marc Andreessen'],
    correctIndex: 1,
    category: 'technology',
    difficulty: 'medium',
  },
  {
    id: 'tch-015',
    question: 'What is "open source" software?',
    options: [
      'Software that costs nothing',
      'Software whose source code is publicly available',
      'Software made by the government',
      'Software that runs on any operating system',
    ],
    correctIndex: 1,
    category: 'technology',
    difficulty: 'easy',
  },
  {
    id: 'tch-016',
    question: 'Which programming language is most associated with web development alongside HTML and CSS?',
    options: ['Python', 'C++', 'JavaScript', 'Ruby'],
    correctIndex: 2,
    category: 'technology',
    difficulty: 'easy',
  },
  {
    id: 'tch-017',
    question: 'What technology does Bitcoin use as its underlying ledger system?',
    options: ['Cloud computing', 'Blockchain', 'Quantum computing', 'Relational database'],
    correctIndex: 1,
    category: 'technology',
    difficulty: 'easy',
  },
  {
    id: 'tch-018',
    question: 'What does "RAM" stand for?',
    options: ['Read Access Memory', 'Random Access Memory', 'Run Application Memory', 'Rapid Access Module'],
    correctIndex: 1,
    category: 'technology',
    difficulty: 'easy',
  },
  {
    id: 'tch-019',
    question: 'Which company owns Instagram, WhatsApp, and Facebook?',
    options: ['Alphabet', 'Meta', 'Microsoft', 'Amazon'],
    correctIndex: 1,
    category: 'technology',
    difficulty: 'easy',
  },
  {
    id: 'tch-020',
    question: 'What is the name of Elon Musk\'s space exploration company?',
    options: ['Blue Origin', 'Virgin Galactic', 'SpaceX', 'Rocket Lab'],
    correctIndex: 2,
    category: 'technology',
    difficulty: 'easy',
  },
  {
    id: 'tch-021',
    question: 'In computing, what does "GPU" stand for?',
    options: ['General Processing Unit', 'Graphics Processing Unit', 'Global Performance Utility', 'Graphical Program Unit'],
    correctIndex: 1,
    category: 'technology',
    difficulty: 'easy',
  },
];

// ============================================
// Question Bank — Literature (20+)
// ============================================

const literatureQuestions: TriviaQuestion[] = [
  {
    id: 'lit-001',
    question: 'Who wrote "Romeo and Juliet"?',
    options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
    correctIndex: 1,
    category: 'literature',
    difficulty: 'easy',
  },
  {
    id: 'lit-002',
    question: 'What is the best-selling book of all time (excluding religious texts)?',
    options: ['Harry Potter', 'The Lord of the Rings', 'Don Quixote', 'A Tale of Two Cities'],
    correctIndex: 2,
    category: 'literature',
    difficulty: 'medium',
  },
  {
    id: 'lit-003',
    question: 'Who wrote "1984"?',
    options: ['Aldous Huxley', 'George Orwell', 'Ray Bradbury', 'H.G. Wells'],
    correctIndex: 1,
    category: 'literature',
    difficulty: 'easy',
  },
  {
    id: 'lit-004',
    question: 'Which novel begins with the line "Call me Ishmael"?',
    options: ['The Old Man and the Sea', 'Moby-Dick', 'Treasure Island', 'Robinson Crusoe'],
    correctIndex: 1,
    category: 'literature',
    difficulty: 'medium',
  },
  {
    id: 'lit-005',
    question: 'Who wrote "The Alchemist"?',
    options: ['Gabriel García Márquez', 'Paulo Coelho', 'Isabel Allende', 'Jorge Luis Borges'],
    correctIndex: 1,
    category: 'literature',
    difficulty: 'easy',
  },
  {
    id: 'lit-006',
    question: 'Which poet wrote the famous collection of poems called "The Masnavi"?',
    options: ['Hafiz', 'Omar Khayyam', 'Rumi', 'Saadi'],
    correctIndex: 2,
    category: 'literature',
    difficulty: 'medium',
  },
  {
    id: 'lit-007',
    question: '"One Thousand and One Nights" is a collection of folk tales from which region?',
    options: ['South Asia', 'East Asia', 'Middle East', 'North Africa'],
    correctIndex: 2,
    category: 'literature',
    difficulty: 'easy',
  },
  {
    id: 'lit-008',
    question: 'Who wrote "Pride and Prejudice"?',
    options: ['Emily Brontë', 'Charlotte Brontë', 'Jane Austen', 'Virginia Woolf'],
    correctIndex: 2,
    category: 'literature',
    difficulty: 'easy',
  },
  {
    id: 'lit-009',
    question: 'Which Shakespearean play features the characters Othello and Iago?',
    options: ['Hamlet', 'Macbeth', 'King Lear', 'Othello'],
    correctIndex: 3,
    category: 'literature',
    difficulty: 'easy',
  },
  {
    id: 'lit-010',
    question: 'Who is the author of "The Muqaddimah," a foundational text of historiography?',
    options: ['Al-Tabari', 'Ibn Khaldun', 'Al-Masudi', 'Ibn Battuta'],
    correctIndex: 1,
    category: 'literature',
    difficulty: 'hard',
  },
  {
    id: 'lit-011',
    question: 'What literary genre does J.R.R. Tolkien\'s "The Lord of the Rings" belong to?',
    options: ['Science Fiction', 'Mystery', 'High Fantasy', 'Historical Fiction'],
    correctIndex: 2,
    category: 'literature',
    difficulty: 'easy',
  },
  {
    id: 'lit-012',
    question: 'Who wrote "To Kill a Mockingbird"?',
    options: ['Harper Lee', 'F. Scott Fitzgerald', 'Ernest Hemingway', 'John Steinbeck'],
    correctIndex: 0,
    category: 'literature',
    difficulty: 'easy',
  },
  {
    id: 'lit-013',
    question: 'Which Nobel Prize-winning author wrote "One Hundred Years of Solitude"?',
    options: ['Mario Vargas Llosa', 'Gabriel García Márquez', 'Octavio Paz', 'Pablo Neruda'],
    correctIndex: 1,
    category: 'literature',
    difficulty: 'medium',
  },
  {
    id: 'lit-014',
    question: 'Who is the author of the famous travel memoir "Rihla"?',
    options: ['Marco Polo', 'Ibn Battuta', 'Zheng He', 'Al-Idrisi'],
    correctIndex: 1,
    category: 'literature',
    difficulty: 'medium',
  },
  {
    id: 'lit-015',
    question: 'What is the literary term for a story within a story?',
    options: ['Allegory', 'Foreshadowing', 'Frame narrative', 'Flashback'],
    correctIndex: 2,
    category: 'literature',
    difficulty: 'medium',
  },
  {
    id: 'lit-016',
    question: 'Which ancient Greek epic poem tells the story of the Trojan War?',
    options: ['The Odyssey', 'The Iliad', 'The Aeneid', 'The Republic'],
    correctIndex: 1,
    category: 'literature',
    difficulty: 'medium',
  },
  {
    id: 'lit-017',
    question: 'Who wrote the dystopian novel "Brave New World"?',
    options: ['George Orwell', 'Aldous Huxley', 'Ray Bradbury', 'Kurt Vonnegut'],
    correctIndex: 1,
    category: 'literature',
    difficulty: 'medium',
  },
  {
    id: 'lit-018',
    question: 'Which poet is famous for the "Rubaiyat," a collection of quatrains?',
    options: ['Rumi', 'Hafiz', 'Omar Khayyam', 'Saadi'],
    correctIndex: 2,
    category: 'literature',
    difficulty: 'medium',
  },
  {
    id: 'lit-019',
    question: 'Who wrote "The Great Gatsby"?',
    options: ['Ernest Hemingway', 'F. Scott Fitzgerald', 'William Faulkner', 'John Steinbeck'],
    correctIndex: 1,
    category: 'literature',
    difficulty: 'easy',
  },
  {
    id: 'lit-020',
    question: 'What is the name of the fictional detective created by Arthur Conan Doyle?',
    options: ['Hercule Poirot', 'Philip Marlowe', 'Sherlock Holmes', 'Miss Marple'],
    correctIndex: 2,
    category: 'literature',
    difficulty: 'easy',
  },
  {
    id: 'lit-021',
    question: 'Which philosopher wrote "The Republic"?',
    options: ['Aristotle', 'Socrates', 'Plato', 'Epicurus'],
    correctIndex: 2,
    category: 'literature',
    difficulty: 'medium',
  },
];

// ============================================
// Question Bank — General Knowledge (20+)
// ============================================

const generalQuestions: TriviaQuestion[] = [
  {
    id: 'gen-001',
    question: 'How many continents are there on Earth?',
    options: ['5', '6', '7', '8'],
    correctIndex: 2,
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'gen-002',
    question: 'What is the currency of Japan?',
    options: ['Yuan', 'Won', 'Yen', 'Rupee'],
    correctIndex: 2,
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'gen-003',
    question: 'How many colors are in a rainbow?',
    options: ['5', '6', '7', '8'],
    correctIndex: 2,
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'gen-004',
    question: 'What is the most spoken language in the world by total speakers?',
    options: ['Spanish', 'Mandarin Chinese', 'English', 'Hindi'],
    correctIndex: 2,
    category: 'general',
    difficulty: 'medium',
  },
  {
    id: 'gen-005',
    question: 'Which blood type is known as the "universal donor"?',
    options: ['A+', 'B+', 'AB+', 'O-'],
    correctIndex: 3,
    category: 'general',
    difficulty: 'medium',
  },
  {
    id: 'gen-006',
    question: 'What is the tallest building in the world as of 2024?',
    options: ['Shanghai Tower', 'Burj Khalifa', 'Makkah Royal Clock Tower', 'One World Trade Center'],
    correctIndex: 1,
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'gen-007',
    question: 'How many days are in a leap year?',
    options: ['364', '365', '366', '367'],
    correctIndex: 2,
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'gen-008',
    question: 'What is the largest mammal on Earth?',
    options: ['African Elephant', 'Blue Whale', 'Giraffe', 'Hippopotamus'],
    correctIndex: 1,
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'gen-009',
    question: 'What does "UNESCO" stand for?',
    options: [
      'United Nations Educational, Scientific and Cultural Organization',
      'United Nations Environmental, Social and Cultural Office',
      'Universal Education, Science and Culture Organization',
      'United Nations Economic and Social Council Office',
    ],
    correctIndex: 0,
    category: 'general',
    difficulty: 'medium',
  },
  {
    id: 'gen-010',
    question: 'Which language has the most native speakers?',
    options: ['English', 'Spanish', 'Mandarin Chinese', 'Hindi'],
    correctIndex: 2,
    category: 'general',
    difficulty: 'medium',
  },
  {
    id: 'gen-011',
    question: 'What is the national flower of Japan?',
    options: ['Rose', 'Cherry Blossom', 'Lotus', 'Tulip'],
    correctIndex: 1,
    category: 'general',
    difficulty: 'medium',
  },
  {
    id: 'gen-012',
    question: 'How many sides does a hexagon have?',
    options: ['5', '6', '7', '8'],
    correctIndex: 1,
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'gen-013',
    question: 'What is the symbol of peace recognized worldwide?',
    options: ['Heart', 'Dove', 'Olive branch', 'White flag'],
    correctIndex: 1,
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'gen-014',
    question: 'Which planet is known for its prominent ring system?',
    options: ['Jupiter', 'Uranus', 'Neptune', 'Saturn'],
    correctIndex: 3,
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'gen-015',
    question: 'What percentage of the Earth\'s surface is covered by water?',
    options: ['51%', '61%', '71%', '81%'],
    correctIndex: 2,
    category: 'general',
    difficulty: 'medium',
  },
  {
    id: 'gen-016',
    question: 'In which year did the Titanic sink?',
    options: ['1910', '1912', '1914', '1916'],
    correctIndex: 1,
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'gen-017',
    question: 'What is the primary language spoken in Brazil?',
    options: ['Spanish', 'Portuguese', 'French', 'English'],
    correctIndex: 1,
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'gen-018',
    question: 'How many teeth does an adult human typically have?',
    options: ['28', '30', '32', '34'],
    correctIndex: 2,
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'gen-019',
    question: 'Which country gifted the Statue of Liberty to the United States?',
    options: ['England', 'France', 'Germany', 'Italy'],
    correctIndex: 1,
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'gen-020',
    question: 'What is the boiling point of water at sea level in Celsius?',
    options: ['90°C', '95°C', '100°C', '105°C'],
    correctIndex: 2,
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'gen-021',
    question: 'Which instrument has 88 keys?',
    options: ['Guitar', 'Violin', 'Piano', 'Organ'],
    correctIndex: 2,
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'gen-022',
    question: 'What is the most widely practiced religion in the world?',
    options: ['Islam', 'Christianity', 'Hinduism', 'Buddhism'],
    correctIndex: 1,
    category: 'general',
    difficulty: 'easy',
  },
];

// ============================================
// Complete Question Bank
// ============================================

const QUESTION_BANK: TriviaQuestion[] = [
  ...islamicQuestions,
  ...quranQuestions,
  ...historyQuestions,
  ...scienceQuestions,
  ...geographyQuestions,
  ...popCultureQuestions,
  ...sportsQuestions,
  ...foodQuestions,
  ...technologyQuestions,
  ...literatureQuestions,
  ...generalQuestions,
];

// ============================================
// Utility Functions
// ============================================

/**
 * Deterministic seeded random number generator (mulberry32).
 * Produces consistent sequences for the same seed value.
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle with optional seeded RNG.
 */
function shuffle<T>(array: T[], rng?: () => number): T[] {
  const shuffled = [...array];
  const random = rng ?? Math.random;
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Convert a date to a numeric seed (YYYYMMDD).
 */
function dateToSeed(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return year * 10000 + month * 100 + day;
}

/**
 * Map a free-text topic to the closest TriviaCategory.
 */
function matchTopicToCategory(topic: string): TriviaCategory {
  const lower = topic.toLowerCase().trim();

  const keywordMap: Record<string, TriviaCategory> = {
    islam: 'islamic',
    muslim: 'islamic',
    prayer: 'islamic',
    salah: 'islamic',
    ramadan: 'islamic',
    hajj: 'islamic',
    zakat: 'islamic',
    shahada: 'islamic',
    mosque: 'islamic',
    masjid: 'islamic',
    eid: 'islamic',
    prophet: 'islamic',
    sunnah: 'islamic',
    hadith: 'quran',
    quran: 'quran',
    surah: 'quran',
    ayah: 'quran',
    verse: 'quran',
    tafsir: 'quran',
    recitation: 'quran',
    history: 'history',
    war: 'history',
    ancient: 'history',
    empire: 'history',
    civilization: 'history',
    revolution: 'history',
    dynasty: 'history',
    medieval: 'history',
    science: 'science',
    biology: 'science',
    chemistry: 'science',
    physics: 'science',
    nature: 'science',
    space: 'science',
    planet: 'science',
    animal: 'science',
    geography: 'geography',
    country: 'geography',
    capital: 'geography',
    continent: 'geography',
    ocean: 'geography',
    mountain: 'geography',
    river: 'geography',
    city: 'geography',
    movie: 'pop_culture',
    film: 'pop_culture',
    music: 'pop_culture',
    celebrity: 'pop_culture',
    tv: 'pop_culture',
    television: 'pop_culture',
    show: 'pop_culture',
    anime: 'pop_culture',
    game: 'pop_culture',
    gaming: 'pop_culture',
    sport: 'sports',
    soccer: 'sports',
    football: 'sports',
    basketball: 'sports',
    tennis: 'sports',
    cricket: 'sports',
    olympic: 'sports',
    athlete: 'sports',
    food: 'food',
    cuisine: 'food',
    cooking: 'food',
    recipe: 'food',
    dish: 'food',
    restaurant: 'food',
    halal: 'food',
    tech: 'technology',
    technology: 'technology',
    computer: 'technology',
    programming: 'technology',
    software: 'technology',
    internet: 'technology',
    ai: 'technology',
    robot: 'technology',
    phone: 'technology',
    book: 'literature',
    literature: 'literature',
    novel: 'literature',
    author: 'literature',
    poet: 'literature',
    poetry: 'literature',
    writing: 'literature',
    story: 'literature',
  };

  // Check for keyword matches
  for (const [keyword, category] of Object.entries(keywordMap)) {
    if (lower.includes(keyword)) {
      return category;
    }
  }

  return 'general';
}

// ============================================
// Public API
// ============================================

export interface GetQuestionsOptions {
  /** Filter by specific categories. Defaults to all. */
  categories?: TriviaCategory[];
  /** Filter by difficulty levels. Defaults to all. */
  difficulty?: ('easy' | 'medium' | 'hard')[];
  /** Number of questions to return. Defaults to 10. */
  count?: number;
  /** IDs to exclude (e.g., previously seen questions). */
  excludeIds?: string[];
}

/**
 * Get questions filtered by category, difficulty, and count.
 * Results are shuffled randomly.
 */
export function getQuestions(options: GetQuestionsOptions = {}): TriviaQuestion[] {
  const {
    categories,
    difficulty,
    count = 10,
    excludeIds = [],
  } = options;

  const excludeSet = new Set(excludeIds);

  let filtered = QUESTION_BANK.filter((q) => {
    if (excludeSet.has(q.id)) return false;
    if (categories && categories.length > 0 && !categories.includes(q.category)) return false;
    if (difficulty && difficulty.length > 0 && !difficulty.includes(q.difficulty)) return false;
    return true;
  });

  filtered = shuffle(filtered);

  return filtered.slice(0, count);
}

/**
 * Get daily challenge questions — deterministic based on date.
 * Same questions for all users on the same day.
 * Returns 7 questions with escalating difficulty and mixed categories.
 */
export function getDailyQuestions(date?: Date): TriviaQuestion[] {
  const today = date ?? new Date();
  const seed = dateToSeed(today);
  const rng = seededRandom(seed);

  // Separate by difficulty
  const easyPool = shuffle(
    QUESTION_BANK.filter((q) => q.difficulty === 'easy'),
    rng,
  );
  const mediumPool = shuffle(
    QUESTION_BANK.filter((q) => q.difficulty === 'medium'),
    rng,
  );
  const hardPool = shuffle(
    QUESTION_BANK.filter((q) => q.difficulty === 'hard'),
    rng,
  );

  // Pick questions with escalating difficulty:
  // 2 easy, 3 medium, 2 hard = 7 total
  const selected: TriviaQuestion[] = [];
  const usedCategories = new Set<TriviaCategory>();

  const pickFromPool = (pool: TriviaQuestion[], count: number) => {
    let picked = 0;
    for (const q of pool) {
      if (picked >= count) break;
      // Prefer category diversity
      if (usedCategories.has(q.category) && picked < count - 1) {
        // Try to find a different category, but don't skip forever
        const remaining = pool.filter(
          (p) => !usedCategories.has(p.category) && !selected.includes(p),
        );
        if (remaining.length > 0) {
          const alt = remaining[0];
          selected.push(alt);
          usedCategories.add(alt.category);
          picked++;
          continue;
        }
      }
      if (!selected.includes(q)) {
        selected.push(q);
        usedCategories.add(q.category);
        picked++;
      }
    }
  };

  pickFromPool(easyPool, 2);
  pickFromPool(mediumPool, 3);
  pickFromPool(hardPool, 2);

  return selected;
}

/**
 * AI-ready question generator (placeholder for future API integration).
 * Currently returns local bank questions filtered by the closest matching category.
 * In the future, this will call an AI API to generate custom questions.
 */
export async function generateQuestions(
  topic: string,
  count: number = 10,
): Promise<TriviaQuestion[]> {
  // TODO: In future, call AI API to generate custom questions
  // e.g., const response = await fetch('/api/trivia/generate', { body: { topic, count } });

  const category = matchTopicToCategory(topic);
  return getQuestions({ categories: [category], count });
}

/**
 * Get all available categories with their question counts.
 */
export function getCategoryStats(): Record<TriviaCategory, { total: number; easy: number; medium: number; hard: number }> {
  const stats = {} as Record<TriviaCategory, { total: number; easy: number; medium: number; hard: number }>;

  for (const category of ALL_CATEGORIES) {
    const questions = QUESTION_BANK.filter((q) => q.category === category);
    stats[category] = {
      total: questions.length,
      easy: questions.filter((q) => q.difficulty === 'easy').length,
      medium: questions.filter((q) => q.difficulty === 'medium').length,
      hard: questions.filter((q) => q.difficulty === 'hard').length,
    };
  }

  return stats;
}

/**
 * Get the total number of questions in the bank.
 */
export function getTotalQuestionCount(): number {
  return QUESTION_BANK.length;
}

/**
 * Get a single random question, optionally filtered.
 */
export function getRandomQuestion(options?: {
  category?: TriviaCategory;
  difficulty?: 'easy' | 'medium' | 'hard';
  excludeIds?: string[];
}): TriviaQuestion | null {
  const results = getQuestions({
    categories: options?.category ? [options.category] : undefined,
    difficulty: options?.difficulty ? [options.difficulty] : undefined,
    count: 1,
    excludeIds: options?.excludeIds,
  });
  return results[0] ?? null;
}
