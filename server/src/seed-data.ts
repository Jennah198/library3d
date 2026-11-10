// DEMO CATALOG. Replace with your real catalog (see README: "Loading a real catalogue").
//
// - Real, well-known titles are used where possible, but years for classical works are
//   approximate and every entry should be verified before you publish.
// - Entries with the trailing `1` are placeholders ("sample records") used to demonstrate
//   Amharic shelves; the UI labels them as samples.

export interface SeedShelf {
  slug: string
  title: string
  titleAr: string
  titleAm: string
  description: string
  color: string
  x: number
  z: number
  rotation: number
}

export const shelves: SeedShelf[] = [
  // Row A (north wall, faces +z)
  { slug: 'history', title: 'History', titleAr: 'التاريخ', titleAm: 'ታሪክ', description: 'Chronicles, empires and the story of Ethiopia and the wider world.', color: '#9c4a2f', x: -9, z: -5.6, rotation: 0 },
  { slug: 'science', title: 'Science', titleAr: 'العلوم', titleAm: 'ሳይንስ', description: 'From the origin of species to the structure of the cosmos.', color: '#2f6f8f', x: -3, z: -5.6, rotation: 0 },
  { slug: 'literature', title: 'Literature', titleAr: 'الأدب', titleAm: 'ሥነ ጽሑፍ', description: 'Novels and stories that shaped how we read the world.', color: '#7a3b5e', x: 3, z: -5.6, rotation: 0 },
  { slug: 'philosophy', title: 'Philosophy', titleAr: 'الفلسفة', titleAm: 'ፍልስፍና', description: 'Reason, ethics and the big questions.', color: '#4d5f8a', x: 9, z: -5.6, rotation: 0 },
  // Row B (south wall, faces -z)
  { slug: 'religion', title: 'Religion', titleAr: 'الدين', titleAm: 'ሃይማኖት', description: 'Scripture, theology and the study of faith.', color: '#3f7a55', x: -9, z: 5.6, rotation: Math.PI },
  { slug: 'technology', title: 'Technology', titleAr: 'التقنية', titleAm: 'ቴክኖሎጂ', description: 'Computing, engineering and the craft of building things.', color: '#c7882b', x: -3, z: 5.6, rotation: Math.PI },
  { slug: 'poetry', title: 'Poetry', titleAr: 'الشعر', titleAm: 'ግጥም', description: 'Verse from the oral tradition to the modern page.', color: '#a0546b', x: 3, z: 5.6, rotation: Math.PI },
  { slug: 'geography', title: 'Geography', titleAr: 'الجغرافيا', titleAm: 'ጂኦግራፊ', description: 'Maps, travel and the shape of the land.', color: '#4f7f78', x: 9, z: 5.6, rotation: Math.PI },
]

export type SeedBook = [
  shelf: string,
  language: 'en' | 'ar' | 'am',
  year: number | null,
  author: string,
  title: string,
  sample?: 1,
]

export const books: SeedBook[] = [
  // ── History ──────────────────────────────────────────────
  ['history', 'en', 1776, 'Edward Gibbon', 'The Decline and Fall of the Roman Empire'],
  ['history', 'en', 1960, 'William L. Shirer', 'The Rise and Fall of the Third Reich'],
  ['history', 'en', 1980, 'Howard Zinn', "A People's History of the United States"],
  ['history', 'en', 1983, 'Ryszard Kapuściński', 'The Emperor: Downfall of an Autocrat'],
  ['history', 'en', 1994, 'Harold G. Marcus', 'A History of Ethiopia'],
  ['history', 'en', 1997, 'Jared Diamond', 'Guns, Germs, and Steel'],
  ['history', 'en', 1998, 'Richard Pankhurst', 'The Ethiopians: A History'],
  ['history', 'en', 2014, 'Yuval Noah Harari', 'Sapiens: A Brief History of Humankind'],
  ['history', 'en', 2015, 'Mary Beard', 'SPQR: A History of Ancient Rome'],
  ['history', 'ar', 915, 'الطبري', 'تاريخ الرسل والملوك'],
  ['history', 'ar', 947, 'المسعودي', 'مروج الذهب'],
  ['history', 'ar', 1231, 'ابن الأثير', 'الكامل في التاريخ'],
  ['history', 'ar', 1274, 'ابن خلكان', 'وفيات الأعيان'],
  ['history', 'ar', 1377, 'ابن خلدون', 'المقدمة'],
  ['history', 'am', 1922, 'አለቃ ታዬ ገብረ ማርያም', 'የኢትዮጵያ ሕዝብ ታሪክ', 1],
  ['history', 'am', 1960, 'ምሳሌ ደራሲ', 'የኢትዮጵያ ታሪክ (ምሳሌ ፩)', 1],
  ['history', 'am', 1985, 'ምሳሌ ደራሲ', 'የዓለም ታሪክ (ምሳሌ ፪)', 1],

  // ── Science ──────────────────────────────────────────────
  ['science', 'en', 1859, 'Charles Darwin', 'On the Origin of Species'],
  ['science', 'en', 1962, 'Rachel Carson', 'Silent Spring'],
  ['science', 'en', 1962, 'Thomas S. Kuhn', 'The Structure of Scientific Revolutions'],
  ['science', 'en', 1968, 'James D. Watson', 'The Double Helix'],
  ['science', 'en', 1976, 'Richard Dawkins', 'The Selfish Gene'],
  ['science', 'en', 1980, 'Carl Sagan', 'Cosmos'],
  ['science', 'en', 1985, 'Richard P. Feynman', "Surely You're Joking, Mr. Feynman!"],
  ['science', 'en', 1988, 'Stephen Hawking', 'A Brief History of Time'],
  ['science', 'ar', 820, 'الخوارزمي', 'الجبر والمقابلة'],
  ['science', 'ar', 1000, 'الزهراوي', 'التصريف لمن عجز عن التأليف'],
  ['science', 'ar', 1021, 'ابن الهيثم', 'كتاب المناظر'],
  ['science', 'ar', 1025, 'ابن سينا', 'القانون في الطب'],
  ['science', 'am', 1990, 'ምሳሌ ደራሲ', 'መሠረታዊ ፊዚክስ (ምሳሌ)', 1],
  ['science', 'am', 2005, 'ምሳሌ ደራሲ', 'የሕይወት ሳይንስ መግቢያ (ምሳሌ)', 1],

  // ── Literature ───────────────────────────────────────────
  ['literature', 'en', 1813, 'Jane Austen', 'Pride and Prejudice'],
  ['literature', 'en', 1925, 'F. Scott Fitzgerald', 'The Great Gatsby'],
  ['literature', 'en', 1949, 'George Orwell', 'Nineteen Eighty-Four'],
  ['literature', 'en', 1958, 'Chinua Achebe', 'Things Fall Apart'],
  ['literature', 'en', 1960, 'Harper Lee', 'To Kill a Mockingbird'],
  ['literature', 'en', 1970, 'Gabriel García Márquez', 'One Hundred Years of Solitude'],
  ['literature', 'en', 1987, 'Toni Morrison', 'Beloved'],
  ['literature', 'ar', null, 'مجهول', 'ألف ليلة وليلة'],
  ['literature', 'ar', 1956, 'نجيب محفوظ', 'بين القصرين'],
  ['literature', 'ar', 1966, 'الطيب صالح', 'موسم الهجرة إلى الشمال'],
  ['literature', 'ar', 1984, 'عبد الرحمن منيف', 'مدن الملح'],
  ['literature', 'ar', 2002, 'علاء الأسواني', 'عمارة يعقوبيان'],
  ['literature', 'am', 1958, 'ሐዲስ ዓለማየሁ', 'ፍቅር እስከ መቃብር'],
  ['literature', 'am', 1970, 'ዳኛቸው ወርቁ', 'አደፍርስ'],
  ['literature', 'am', 1983, 'በዓሉ ግርማ', 'ኦሮማይ'],

  // ── Philosophy ───────────────────────────────────────────
  ['philosophy', 'en', 180, 'Marcus Aurelius', 'Meditations'],
  ['philosophy', 'en', 1641, 'René Descartes', 'Meditations on First Philosophy'],
  ['philosophy', 'en', 1651, 'Thomas Hobbes', 'Leviathan'],
  ['philosophy', 'en', 1781, 'Immanuel Kant', 'Critique of Pure Reason'],
  ['philosophy', 'en', 1883, 'Friedrich Nietzsche', 'Thus Spoke Zarathustra'],
  ['philosophy', 'en', 1927, 'Martin Heidegger', 'Being and Time'],
  ['philosophy', 'en', 1942, 'Albert Camus', 'The Myth of Sisyphus'],
  ['philosophy', 'en', 1971, 'John Rawls', 'A Theory of Justice'],
  ['philosophy', 'ar', 950, 'الفارابي', 'إحصاء العلوم'],
  ['philosophy', 'ar', 1095, 'الغزالي', 'تهافت الفلاسفة'],
  ['philosophy', 'ar', 1175, 'ابن طفيل', 'حي بن يقظان'],
  ['philosophy', 'ar', 1180, 'ابن رشد', 'تهافت التهافت'],
  ['philosophy', 'am', 2000, 'ምሳሌ ደራሲ', 'የፍልስፍና መግቢያ (ምሳሌ)', 1],

  // ── Religion ─────────────────────────────────────────────
  ['religion', 'en', 1902, 'William James', 'The Varieties of Religious Experience'],
  ['religion', 'en', 1952, 'C. S. Lewis', 'Mere Christianity'],
  ['religion', 'en', 1965, 'Malcolm X & Alex Haley', 'The Autobiography of Malcolm X'],
  ['religion', 'en', 1980, 'Muhammad Asad', "The Message of the Qur'an"],
  ['religion', 'en', 1998, 'Lee Strobel', 'The Case for Christ'],
  ['religion', 'en', 2005, 'Reza Aslan', 'No god but God'],
  ['religion', 'ar', 820, 'الشافعي', 'الرسالة'],
  ['religion', 'ar', 1100, 'الغزالي', 'إحياء علوم الدين'],
  ['religion', 'ar', 1270, 'النووي', 'رياض الصالحين'],
  ['religion', 'ar', 1370, 'ابن كثير', 'تفسير القرآن العظيم'],
  ['religion', 'am', null, 'የተለያዩ ጸሐፍት', 'መጽሐፍ ቅዱስ'],
  ['religion', 'am', null, 'ያልታወቀ', 'ክብረ ነገሥት'],

  // ── Technology ───────────────────────────────────────────
  ['technology', 'en', 1975, 'Frederick P. Brooks Jr.', 'The Mythical Man-Month'],
  ['technology', 'en', 1978, 'Brian W. Kernighan & Dennis M. Ritchie', 'The C Programming Language'],
  ['technology', 'en', 1985, 'Harold Abelson & Gerald Jay Sussman', 'Structure and Interpretation of Computer Programs'],
  ['technology', 'en', 1990, 'Thomas H. Cormen et al.', 'Introduction to Algorithms'],
  ['technology', 'en', 1994, 'Erich Gamma et al.', 'Design Patterns'],
  ['technology', 'en', 1999, 'Andrew Hunt & David Thomas', 'The Pragmatic Programmer'],
  ['technology', 'en', 2008, 'Robert C. Martin', 'Clean Code'],
  ['technology', 'en', 2017, 'Martin Kleppmann', 'Designing Data-Intensive Applications'],
  ['technology', 'ar', 850, 'بنو موسى', 'كتاب الحيل'],
  ['technology', 'ar', 1206, 'الجزري', 'الجامع بين العلم والعمل النافع في صناعة الحيل'],
  ['technology', 'am', 2015, 'ምሳሌ ደራሲ', 'የኮምፒውተር ፕሮግራሚንግ መግቢያ (ምሳሌ)', 1],

  // ── Poetry ───────────────────────────────────────────────
  ['poetry', 'en', 1855, 'Walt Whitman', 'Leaves of Grass'],
  ['poetry', 'en', 1922, 'T. S. Eliot', 'The Waste Land'],
  ['poetry', 'en', 1923, 'Kahlil Gibran', 'The Prophet'],
  ['poetry', 'en', 1926, 'Langston Hughes', 'The Weary Blues'],
  ['poetry', 'en', 1956, 'Allen Ginsberg', 'Howl and Other Poems'],
  ['poetry', 'en', 1965, 'Sylvia Plath', 'Ariel'],
  ['poetry', 'en', 2014, 'Rupi Kaur', 'Milk and Honey'],
  ['poetry', 'ar', null, 'شعراء الجاهلية', 'المعلقات'],
  ['poetry', 'ar', null, 'المتنبي', 'ديوان المتنبي'],
  ['poetry', 'ar', 1966, 'نزار قباني', 'الرسم بالكلمات'],
  ['poetry', 'ar', 1995, 'محمود درويش', 'لماذا تركت الحصان وحيدا'],
  ['poetry', 'am', 1980, 'ምሳሌ ገጣሚ', 'የግጥም ስብስብ (ምሳሌ ፩)', 1],
  ['poetry', 'am', 1995, 'ምሳሌ ገጣሚ', 'የግጥም ስብስብ (ምሳሌ ፪)', 1],

  // ── Geography ────────────────────────────────────────────
  ['geography', 'en', 1960, 'Alan Moorehead', 'The White Nile'],
  ['geography', 'en', 1962, 'Alan Moorehead', 'The Blue Nile'],
  ['geography', 'en', 1962, 'John Steinbeck', 'Travels with Charley'],
  ['geography', 'en', 1978, 'Peter Matthiessen', 'The Snow Leopard'],
  ['geography', 'en', 1987, 'Bruce Chatwin', 'The Songlines'],
  ['geography', 'en', 1996, 'Jon Krakauer', 'Into the Wild'],
  ['geography', 'en', 2015, 'Tim Marshall', 'Prisoners of Geography'],
  ['geography', 'ar', 951, 'الإصطخري', 'المسالك والممالك'],
  ['geography', 'ar', 1154, 'الإدريسي', 'نزهة المشتاق في اختراق الآفاق'],
  ['geography', 'ar', 1228, 'ياقوت الحموي', 'معجم البلدان'],
  ['geography', 'ar', 1355, 'ابن بطوطة', 'رحلة ابن بطوطة'],
  ['geography', 'am', 2000, 'ምሳሌ ደራሲ', 'የኢትዮጵያ ጂኦግራፊ (ምሳሌ)', 1],
]
