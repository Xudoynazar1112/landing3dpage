export type Locale = 'uz' | 'ru' | 'en';

export type SpecialtyId =
  | 'epilepsy'
  | 'autism'
  | 'sleep'
  | 'developmental'
  | 'migraine'
  | 'adhd';

export interface SpecialtyItem {
  id: SpecialtyId;
  side: 'left' | 'right';
  title: Record<Locale, string>;
  subtitle: Record<Locale, string>;
  brainRegionLabel: Record<Locale, string>;
  /** Target 3D coordinates on the holographic brain model (normalized brain space) */
  focusPoint: [number, number, number];
  /** Camera spherical angle offset [azimuthRad, elevationRad] */
  cameraAngle: [number, number];
  accentHex: string;
  overview: Record<Locale, string>;
  symptoms: Record<Locale, string[]>;
  diagnostics: Record<Locale, string[]>;
  approach: Record<Locale, string>;
}

export interface StatMetric {
  id: string;
  value: number;
  suffix: string;
  label: Record<Locale, string>;
  context: Record<Locale, string>;
}

export interface ScientificPublication {
  id: string;
  category: 'epilepsy' | 'neurodevelopment' | 'international';
  year: number;
  journal: string;
  title: Record<Locale, string>;
  summary: Record<Locale, string>;
  coAuthors: string;
  doi: string;
}

export interface TestimonialItem {
  id: string;
  parentName: string;
  city: string;
  childProfile: Record<Locale, string>;
  specialtyId: SpecialtyId;
  quote: Record<Locale, string>;
  outcome: Record<Locale, string>;
}

export interface CareerMilestone {
  period: string;
  title: Record<Locale, string>;
  institution: Record<Locale, string>;
}

export interface CertificateItem {
  id: string;
  code: string;
  date: string;
  orientation: 'landscape' | 'portrait';
  imageUrl: string;
  pdfUrl: string;
  issuer: Record<Locale, string>;
  title: Record<Locale, string>;
  subtitle: Record<Locale, string>;
  details: Record<Locale, string>;
}

export const ASSETS = {
  logo: '/assets/dzilogo.png',
  heroDoctor: '/assets/aistudio/main2_c58c69fc.PNG',
  aboutConsultation: '/src/assets/images/about_doctor_consultation_1795248827640.jpg',
  aboutVideoCover: '/assets/aistudio/1_e3f0ee62.jpg',
  scientificSynapse: '/src/assets/images/scientific_synapse_art_1795248807915.jpg',
  introVideoId: 'ssVKf-fcFNc',
  introVideoStartSec: 95,
  introVideoUrl: 'https://www.youtube.com/watch?v=ssVKf-fcFNc&t=95s',
} as const;

export const CERTIFICATES: CertificateItem[] = [
  {
    id: 'cert-epns',
    code: 'EPNS · 2021',
    date: '13.01.2021',
    orientation: 'landscape',
    imageUrl: '/assets/certificates/cert_epns.jpg',
    pdfUrl:
      '/assets/aistudio/20210114-EPNS-q4j0_0158bdff-d7f0-46ae-8572-4b0630cfeab4_68d5fd8c.pdf',
    issuer: {
      uz: 'European Paediatric Neurology Society (EPNS)',
      ru: 'Европейское общество детской неврологии (EPNS)',
      en: 'European Paediatric Neurology Society (EPNS)',
    },
    title: {
      uz: 'Status Epilepticus in Children',
      ru: 'Эпилептический статус у детей (EPNS)',
      en: 'EPNS Webinar: Status Epilepticus in Children',
    },
    subtitle: {
      uz: 'Professor Federico Vigevano · Xalqaro sertifikat',
      ru: 'Профессор Федерико Виджевано · Международный сертификат',
      en: 'Speaker: Professor Federico Vigevano · Certificate of Attendance',
    },
    details: {
      uz: 'Yevropa Bolalar Nevrologiyasi Jamiyati (EPNS) tomonidan bolalarda epileptik statusni zamonaviy boshqarish bo‘yicha berilgan xalqaro sertifikat.',
      ru: 'Международный сертификат EPNS по современному ведению эпилептического статуса у детей (лектор — проф. Федерико Виджевано).',
      en: 'Official European Paediatric Neurology Society certificate for pediatric status epilepticus clinical management led by Prof. Federico Vigevano.',
    },
  },
  {
    id: 'cert-neurology-144',
    code: 'MM № 288222',
    date: '16.04.2026',
    orientation: 'landscape',
    imageUrl: '/assets/certificates/cert_neurology_144.jpg',
    pdfUrl: '/assets/aistudio/Ismailov_Zoxidjon_Nurmanovich_6d4f9ffd.pdf',
    issuer: {
      uz: 'O‘zbekiston Respublikasi Sog‘liqni saqlash vazirligi',
      ru: 'Министерство здравоохранения Республики Узбекистан',
      en: 'Ministry of Health of the Republic of Uzbekistan',
    },
    title: {
      uz: '144 kredit «Nevrologiya» malaka oshirish sertifikati',
      ru: 'Сертификат повышения квалификации «Неврология» (144 кредита)',
      en: '144-Credit Continuing Medical Education in Neurology',
    },
    subtitle: {
      uz: 'WorldMedEducation · 5 yil amal qilish muddati',
      ru: 'WorldMedEducation · Срок действия 5 лет',
      en: 'WorldMedEducation · Valid for 5 years',
    },
    details: {
      uz: 'Uzluksiz kasbiy ta’lim tizimida 16.03.2026 – 16.04.2026 davomida 144 kreditli «Nevrologiya» malaka oshirish kursini muvaffaqiyatli yakunlaganligi to‘g‘risida rasmiy davlat sertifikati.',
      ru: 'Государственный сертификат о прохождении 144-кредитного курса повышения квалификации по неврологии (16.03.2026 – 16.04.2026).',
      en: 'Official Ministry of Health continuing medical education certificate confirming completion of the 144-credit Neurology specialization course.',
    },
  },
  {
    id: 'cert-009349',
    code: '№ 009349',
    date: '16.10.2025',
    orientation: 'portrait',
    imageUrl: '/assets/certificates/cert_009349.jpg',
    pdfUrl: '/assets/aistudio/9349_d3bc67f4.pdf',
    issuer: {
      uz: 'O‘zR Adliya vazirligi · Intellektual mulk markazi',
      ru: 'Министерство юстиции РУз · Центр интеллектуальной собственности',
      en: 'Ministry of Justice of Uzbekistan · Intellectual Property Center',
    },
    title: {
      uz: '«Bolalar tibbiy massaji asoslari» o‘quv qo‘llanmasi',
      ru: 'Учебное пособие «Основы детского медицинского массажа»',
      en: 'Copyright Certificate: Fundamentals of Pediatric Medical Massage',
    },
    subtitle: {
      uz: 'Mualliflik huquqi guvohnomasi · № 009349',
      ru: 'Свидетельство об авторском праве · № 009349',
      en: 'State Copyright Deposition · Registry № 009349',
    },
    details: {
      uz: 'O‘zbekiston Respublikasi Adliya vazirligi huzuridagi «Intellektual mulk markazi» reestriga 2025-yil 16-oktabrda 009349-raqam bilan kiritilgan mualliflik huquqi guvohnomasi.',
      ru: 'Государственное свидетельство о депонировании авторских прав № 009349 на учебное пособие по детскому медицинскому массажу (16.10.2025).',
      en: 'Official state copyright deposition certificate № 009349 registered on 16 October 2025 in Tashkent for the pediatric medical massage textbook.',
    },
  },
  {
    id: 'cert-009347',
    code: '№ 009347',
    date: '16.10.2025',
    orientation: 'portrait',
    imageUrl: '/assets/certificates/cert_009347.jpg',
    pdfUrl: '/assets/aistudio/9347_3402fdf6.pdf',
    issuer: {
      uz: 'O‘zR Adliya vazirligi · Intellektual mulk markazi',
      ru: 'Министерство юстиции РУз · Центр интеллектуальной собственности',
      en: 'Ministry of Justice of Uzbekistan · Intellectual Property Center',
    },
    title: {
      uz: '«AKTIV+» mualliflik korreksion terapiya metodik qo‘llanmasi',
      ru: '«AKTIV+» — авторская коррекционная терапия и восстановление',
      en: '«AKTIV+» — Author’s Corrective Therapy & Recovery Method',
    },
    subtitle: {
      uz: 'Mualliflik huquqi guvohnomasi · № 009347',
      ru: 'Свидетельство об авторском праве · № 009347',
      en: 'State Copyright Deposition · Registry № 009347',
    },
    details: {
      uz: '«AKTIV+ — авторская коррекционная терапия и индивидуальное восстановление» metodik qo‘llanmasi bo‘yicha 2025-yil 16-oktabrda berilgan rasmiy mualliflik guvohnomasi.',
      ru: 'Официальное свидетельство № 009347 на авторскую методику коррекционной терапии и индивидуального восстановления «AKTIV+».',
      en: 'State copyright certificate № 009347 for the original «AKTIV+» pediatric corrective therapy and individualized recovery manual.',
    },
  },
];

export const CLINIC_CONTACTS = {
  phones: [
    '+998 33 420 88 48',
    '+998 77 420 88 48',
    '+998 97 620 88 48',
    '+998 97 520 88 48',
  ],
  email: 'dr_zokhidjon@mail.ru',
  website: 'https://drzokhidjon.uz/en',
  telegramUrl: 'https://t.me/drzokhidjon',
  whatsappUrl: 'https://wa.me/998334208848',
  memberships: 'EPNS · EAN · WSO · AOPMC · DUKE Health',
  mapLat: 41.3631232,
  mapLng: 69.2412239,
  googleMapsEmbedUrl: 'https://maps.google.com/maps?q=41.3631232,69.2412239&z=16&output=embed',
  googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=41.3631232,69.2412239',
  yandexMapsUrl: 'https://yandex.uz/maps/?pt=69.2412239,41.3631232&z=17&l=map',
} as const;

export const SPECIALTIES: SpecialtyItem[] = [
  {
    id: 'epilepsy',
    side: 'left',
    title: {
      uz: 'Epilepsiya (tutqanoq)',
      ru: 'Эпилепсия (судороги)',
      en: 'Epilepsy & Seizures',
    },
    subtitle: {
      uz: 'Chakka va peshona bo‘lagi faolligi',
      ru: 'Височно-лобная активность',
      en: 'Temporal & Frontal Lobe Network',
    },
    brainRegionLabel: {
      uz: 'Chakka bo‘lagi (Lobus temporalis)',
      ru: 'Височная доля (Lobus temporalis)',
      en: 'Temporal Lobe (Lobus temporalis)',
    },
    focusPoint: [-0.92, -0.05, 0.25],
    cameraAngle: [-0.85, 0.18],
    accentHex: '#F6C86E',
    overview: {
      uz: 'Bolalarda febril va afebril tutqanoqlarni aniq differensial diagnostika qilish, xalqaro EPNS va ILAE protokollari asosida individual antiepileptik terapiya tanlash va barqaror remissiyaga erishish.',
      ru: 'Точная дифференциальная диагностика фебрильных и афебрильных судорог у детей, подбор индивидуальной противоэпилептической терапии по протоколам EPNS и ILAE.',
      en: 'Precision differential diagnosis of febrile and afebrile pediatric seizures with individualized EPNS & ILAE-guided antiepileptic therapy aimed at sustained remission.',
    },
    symptoms: {
      uz: [
        'Qisqa muddatli nigoh qotishi (absans) yoki hushning xiralashishi',
        'Tungi uyg‘onishlar bilan kechadigan ritmik tortishishlar',
        'Harorat ko‘tarilganda takrorlanuvchi tutqanoq epizodlari',
      ],
      ru: [
        'Кратковременные замирания взгляда (абсансы) или потеря контакта',
        'Ритмичные подёргивания во сне или при пробуждении',
        'Повторяющиеся судорожные эпизоды на фоне температуры',
      ],
      en: [
        'Brief staring spells (absence episodes) or sudden unresponsiveness',
        'Rhythmic nocturnal limb jerking or arousal motor episodes',
        'Recurrent febrile or unprovoked convulsive seizures',
      ],
    },
    diagnostics: {
      uz: ['Tungi Video-EEG monitoring', 'Neyrovizualizatsiya (MRT)', 'Genetik epilepsiya paneli'],
      ru: ['Ночной Видео-ЭЭГ мониторинг', 'Нейровизуализация (МРТ)', 'Генетическая панель эпилепсии'],
      en: ['Overnight Video-EEG Monitoring', 'Brain MRI Neuroimaging', 'Targeted Epilepsy Genetics'],
    },
    approach: {
      uz: 'Ortiqcha dori yuklamasisiz monoterapiya ustuvorligi, Video-EEG dinamik nazorati va ota-onalar uchun aniq harakat rejasi.',
      ru: 'Приоритет монотерапии без избыточной медикаментозной нагрузки, динамический контроль Видео-ЭЭГ и чёткий план действий для родителей.',
      en: 'Monotherapy-first protocols minimizing cognitive side effects, serial Video-EEG tracking, and structured parent safety action plans.',
    },
  },
  {
    id: 'autism',
    side: 'left',
    title: {
      uz: 'Autizm (ASD)',
      ru: 'Аутизм (РАС)',
      en: 'Autism Spectrum (ASD)',
    },
    subtitle: {
      uz: 'Ijtimoiy-kognitiv neyroaloqalar',
      ru: 'Социально-когнитивные нейросети',
      en: 'Social-Cognitive Neural Pathways',
    },
    brainRegionLabel: {
      uz: 'Limbik va medial peshona tarmog‘i',
      ru: 'Лимбическая и медиальная лобная сеть',
      en: 'Limbic & Medial Frontal Network',
    },
    focusPoint: [-0.55, 0.52, 0.72],
    cameraAngle: [-0.45, 0.36],
    accentHex: '#60A5FA',
    overview: {
      uz: 'Erta yoshdan boshlab autizm spektrini aniqlash, neyroreabilitatsiya va sensor-kommunikativ xususiyatlarni baholash hamda multidissiplinar korreksiya xaritasini tuzish.',
      ru: 'Ранняя диагностика расстройств аутистического спектра, оценка сенсорно-коммуникативного профиля и составление программы медицинской нейрореабилитации.',
      en: 'Early neurodevelopmental evaluation for Autism Spectrum Disorder, mapping sensory, communication, and medical rehabilitation pathways.',
    },
    symptoms: {
      uz: [
        'Ismiga chaqirilganda javob bermaslik va ko‘z kontaktining sustligi',
        'Nutq rivojlanishining to‘xtashi yoki takroriy harakatlar',
        'Ovoz, yorug‘lik va teginishga haddan tashqari sezgirlik',
      ],
      ru: [
        'Слабый зрительный контакт и отсутствие отклика на имя',
        'Задержка или регресс речи, стереотипные движения',
        'Повышенная чувствительность к звукам, свету и прикосновениям',
      ],
      en: [
        'Reduced eye contact or inconsistent response to name',
        'Delayed speech milestones, regression, or repetitive motor patterns',
        'Heightened sensory sensitivity to sound, light, or textures',
      ],
    },
    diagnostics: {
      uz: ['ADOS-2 / M-CHAT skrining', 'Subklinik faollik uchun EEG', 'Neyrometabolik baholash'],
      ru: ['Скрининг ADOS-2 / M-CHAT', 'ЭЭГ для исключения субклинической активности', 'Нейрометаболический профиль'],
      en: ['ADOS-2 / M-CHAT Screening', 'Sleep EEG Screening', 'Neurometabolic Assessment'],
    },
    approach: {
      uz: 'Dalillarga asoslangan neyroreabilitatsiya, ABA va logopediya jamoasi bilan muvofiqlashtirilgan reja hamda uyqu-ovqatlanish uyg‘unligi.',
      ru: 'Доказательная нейрореабилитация, координация с ABA-терапевтами и логопедами, нормализация сна и сенсорной интеграции.',
      en: 'Evidence-based neurorehabilitation coordinated with behavioral and speech specialists, avoiding unproven interventions.',
    },
  },
  {
    id: 'sleep',
    side: 'left',
    title: {
      uz: 'Uyqu buzilishlari',
      ru: 'Нарушения сна',
      en: 'Pediatric Sleep Disorders',
    },
    subtitle: {
      uz: 'Miyacha ustuni va gipotalamus ritmi',
      ru: 'Ствол мозга и ритм гипоталамуса',
      en: 'Brainstem & Circadian Rhythm',
    },
    brainRegionLabel: {
      uz: 'Talamus va miya ustuni markazi',
      ru: 'Таламус и стволовой центр сна',
      en: 'Thalamus & Brainstem Sleep Core',
    },
    focusPoint: [0.0, -0.62, -0.15],
    cameraAngle: [-0.25, -0.22],
    accentHex: '#93C5FD',
    overview: {
      uz: 'Tungi qo‘rquvlar (parasomniya), uyquda yurish, kech uxlash va bezovta uyqu epizodlarini bolalar nevrologiyasi nuqtai nazaridan kompleks tekshirish va tiklash.',
      ru: 'Комплексная диагностика и коррекция ночных страхов (парасомний), снохождения, бессонницы и нарушений циркадного ритма у детей.',
      en: 'Comprehensive neurological assessment of parasomnias, night terrors, sleepwalking, circadian misalignment, and fragmented pediatric sleep.',
    },
    symptoms: {
      uz: [
        'Tunda tez-tez uyg‘onib yig‘lash va tungi vahima xurujlari',
        'Kunduzgi charchoq, injiqlik va o‘quv diqqatining pasayishi',
        'Uyquda tish g‘ijirlatish (bruksizm) yoki bezovta oyoqlar sindromi',
      ],
      ru: [
        'Частые ночные пробуждения с плачем и эпизодами ночного страха',
        'Дневная усталость, раздражительность и снижение успеваемости',
        'Скрежет зубами во сне (бруксизм) и беспокойные движения ног',
      ],
      en: [
        'Frequent nighttime awakenings with inconsolable night terrors',
        'Daytime fatigue, irritability, and declining classroom focus',
        'Sleep bruxism, restless legs, or fragmented non-restorative sleep',
      ],
    },
    diagnostics: {
      uz: ['Polisomnografiya tahlili', 'Tungi Video-EEG differensiatsiyasi', 'Sirkad ritm va ferritin auditi'],
      ru: ['Анализ полисомнографии', 'Ночное Видео-ЭЭГ разграничение', 'Оценка ферритина и ритма сна'],
      en: ['Polysomnography Review', 'Nocturnal Video-EEG Differentiation', 'Iron / Ferritin & Circadian Profile'],
    },
    approach: {
      uz: 'Tungi epileptik xurujlarni parasomniyadan aniq ajratish, sirkad gigiyena dasturi va fiziologik uyqu arxitekturasini tiklash.',
      ru: 'Точное разграничение парасомний и ночных приступов, восстановление циркадной гигиены и физиологической структуры сна.',
      en: 'Distinguishing benign parasomnias from nocturnal seizures, restoring circadian sleep hygiene and restorative slow-wave sleep.',
    },
  },
  {
    id: 'developmental',
    side: 'right',
    title: {
      uz: 'Rivojlanish kechikishi',
      ru: 'Задержка развития',
      en: 'Developmental Delay',
    },
    subtitle: {
      uz: 'Nutq, motorika va reabilitatsiya',
      ru: 'Речь, моторика и реабилитация',
      en: 'Speech, Motor & Rehabilitation',
    },
    brainRegionLabel: {
      uz: 'Broka nutq va motor po‘stlog‘i',
      ru: 'Речевая зона Брока и моторная кора',
      en: 'Broca Speech & Motor Cortex',
    },
    focusPoint: [0.85, 0.35, 0.35],
    cameraAngle: [0.78, 0.25],
    accentHex: '#38BDF8',
    overview: {
      uz: 'Chaqaloqlikdan maktabgacha yoshgacha bo‘lgan motor, psixomotor va nutq rivojlanishi kechikishining sabablarini aniqlash hamda zamonaviy tibbiy reabilitatsiya dasturlarini qo‘llash.',
      ru: 'Выявление причин задержки моторного, психомоторного и речевого развития от младенчества до школы с применением современных программ медицинской реабилитации.',
      en: 'Identifying neurological drivers of motor, psychomotor, and speech delays from infancy through preschool with modern medical rehabilitation protocols.',
    },
    symptoms: {
      uz: [
        'Boshni tutish, o‘tirish yoki yurish bosqichlarining ortda qolishi',
        '2 yoshda so‘z boyligining kamligi va ibora tuza olmaslik',
        'Mushak tonusining pasayishi (gipotoniya) yoki haddan tashqari tarangligi',
      ],
      ru: [
        'Задержка удержания головы, сидения или самостоятельной ходьбы',
        'Бедный словарный запас к 2 годам и отсутствие фразовой речи',
        'Пониженный (гипотония) или повышенный мышечный тонус',
      ],
      en: [
        'Delayed head control, sitting, crawling, or independent walking',
        'Limited vocabulary or absent two-word phrases by age 2',
        'Noticeable hypotonia, asymmetric limb use, or motor clumsiness',
      ],
    },
    diagnostics: {
      uz: ['Rivojlanish shkalalari auditi', 'Neyrosonografiya (NSG)', 'Eshitish va nutq neyrodiagnostikasi'],
      ru: ['Оценка по шкалам развития', 'Нейросонография (НСГ)', 'Аудиометрия и речевая диагностика'],
      en: ['Developmental Milestone Scales', 'Cranial Neurosonography', 'Auditory (ABR) & Motor Evaluation'],
    },
    approach: {
      uz: 'Har bir bola uchun individual neyroreabilitatsiya xaritasi, kineziterapiya va neyrologopedik integratsiya.',
      ru: 'Индивидуальная программа нейрореабилитации с интеграцией кинезитерапии и нейрологопедии.',
      en: 'Structured milestone rehabilitation combining pediatric physical therapy, neuro-speech intervention, and parent-guided daily exercises.',
    },
  },
  {
    id: 'migraine',
    side: 'right',
    title: {
      uz: 'Bosh og‘rig‘i va migren',
      ru: 'Головная боль и мигрень',
      en: 'Headache & Migraine',
    },
    subtitle: {
      uz: 'Ensa va qon-tomir neyrotarmog‘i',
      ru: 'Затылочная и сосудистая сеть',
      en: 'Occipital & Neurovascular Network',
    },
    brainRegionLabel: {
      uz: 'Ensa bo‘lagi va trigeminal tizim',
      ru: 'Затылочная доля и сосудистая сеть',
      en: 'Occipital & Neurovascular Pathway',
    },
    focusPoint: [0.42, 0.12, -0.92],
    cameraAngle: [1.35, 0.14],
    accentHex: '#FBBF24',
    overview: {
      uz: 'Maktab yoshidagi bolalar va o‘smirlarda birlamchi migren, zo‘riqish bosh og‘rig‘i hamda qon-tomir xurujlarini EAN va WSO tavsiyalari asosida xavfsiz davolash.',
      ru: 'Безопасная диагностика и профилактика мигрени, головной боли напряжения и сосудистых пароксизмов у детей по рекомендациям EAN и WSO.',
      en: 'Accurate classification and safe preventive care for pediatric migraine, visual aura, and tension headaches guided by EAN & WSO standards.',
    },
    symptoms: {
      uz: [
        'Bir tomonlama pulsatsiyali bosh og‘rig‘i, ko‘ngil aynishi va yorug‘likdan cho‘chish',
        'Og‘riqdan oldin ko‘z oldida chaqmoq yoki xiralashish (aura)',
        'Maktab yuklamasidan so‘ng takrorlanuvchi peshona-chakka og‘rig‘i',
      ],
      ru: [
        'Пульсирующая головная боль с тошнотой и светобоязнью',
        'Вспышки или затуманивание зрения перед приступом (аура)',
        'Регулярные боли в лобно-височной области после школьной нагрузки',
      ],
      en: [
        'Throbbing unilateral or bilateral headaches with photophobia and nausea',
        'Visual aura, shimmering arcs, or temporary blurring before onset',
        'Recurrent afternoon headaches disrupting school attendance and sports',
      ],
    },
    diagnostics: {
      uz: ['Bosh og‘rig‘i kundaligi tahlili', 'Ko‘z tubi va oftalmoskopiya', 'Ko‘rsatma bo‘yicha MRT-angiografiya'],
      ru: ['Анализ дневника головной боли', 'Осмотр глазного дна', 'МР-ангиография по показаниям'],
      en: ['Digital Headache Trigger Diary', 'Fundoscopic Examination', 'Targeted MRI / MRA when indicated'],
    },
    approach: {
      uz: 'Triggerlarni xaritalash, xurujni erta to‘xtatish protokoli va dori qaramligisiz zamonaviy profilaktik terapiya.',
      ru: 'Картирование триггеров, протокол быстрого купирования приступа и современная профилактика без лекарственной зависимости.',
      en: 'Trigger mapping, rapid acute-relief protocols, and pediatric-safe preventive therapy restoring full school participation.',
    },
  },
  {
    id: 'adhd',
    side: 'right',
    title: {
      uz: 'Diqqat yetishmovchiligi (ADHD)',
      ru: 'Дефицит внимания (СДВГ)',
      en: 'Attention & ADHD',
    },
    subtitle: {
      uz: 'Prefrontal ijro nazorati markazi',
      ru: 'Префронтальный центр контроля',
      en: 'Prefrontal Executive Control',
    },
    brainRegionLabel: {
      uz: 'Prefrontal po‘stloq (Cortex praefrontalis)',
      ru: 'Префронтальная кора (Cortex praefrontalis)',
      en: 'Prefrontal Cortex (Executive Hub)',
    },
    focusPoint: [0.22, 0.44, 0.96],
    cameraAngle: [0.35, 0.28],
    accentHex: '#F59E0B',
    overview: {
      uz: 'Diqqatni jamlash, impulsivlik va giperfaollikni neyropsixologik baholash orqali bolaning o‘qish samaradorligi va emotsional muvozanatini oshirish.',
      ru: 'Нейропсихологическая оценка внимания, импульсивности и гиперактивности для повышения успеваемости и эмоциональной устойчивости ребёнка.',
      en: 'Neuropsychological evaluation of executive attention, impulsivity, and hyperactivity to unlock academic confidence and emotional regulation.',
    },
    symptoms: {
      uz: [
        'Boshlangan topshiriqni oxirigacha yetkazishda doimiy qiynalish',
        'Haddan tashqari serharakatlik, navbat kuta olmaslik va tez chalg‘ish',
        'Uy vazifalarida keskin emotsional charchoq va unutuvchanlik',
      ],
      ru: [
        'Сложность доводить начатые задания до конца и частая отвлекаемость',
        'Выраженная двигательная активность, импульсивность и нетерпеливость',
        'Быстрое эмоциональное истощение при выполнении домашних заданий',
      ],
      en: [
        'Persistent difficulty sustaining attention or finishing homework tasks',
        'Restlessness, impulsive interruptions, and rapid distraction',
        'Working-memory lapses and emotional frustration during structured study',
      ],
    },
    diagnostics: {
      uz: ['Vanderbilt / Conners shkalalari', 'Kompyuterlashgan diqqat testi', 'Uyqu va metabolik skrining'],
      ru: ['Шкалы Вандербильта и Коннерса', 'Компьютерный тест внимания', 'Скрининг сна и обмена веществ'],
      en: ['Vanderbilt & Conners Rating Scales', 'Executive Attention Profiling', 'Sleep & Metabolic Rule-Out'],
    },
    approach: {
      uz: 'Kognitiv-xulqiy trening, ota-onalar va maktab uchun individual strategiya hamda zarurat bo‘lganda aniq dozalangan terapiya.',
      ru: 'Когнитивно-поведенческий тренинг, индивидуальные рекомендации для семьи и школы, при необходимости — точная фармакотерапия.',
      en: 'Executive-function coaching, home-and-classroom accommodation plans, and carefully monitored medical therapy when clinically indicated.',
    },
  },
];

export const STATS: StatMetric[] = [
  {
    id: 'experience',
    value: 19,
    suffix: '+',
    label: {
      uz: 'yillik klinik tajriba',
      ru: 'лет клинического опыта',
      en: 'years clinical practice',
    },
    context: {
      uz: '2007 yildan tibbiyotda',
      ru: 'в медицине с 2007 года',
      en: 'in medicine since 2007',
    },
  },
  {
    id: 'patients',
    value: 50000,
    suffix: '+',
    label: {
      uz: 'qabul qilingan bemorlar',
      ru: 'принятых пациентов',
      en: 'pediatric patients seen',
    },
    context: {
      uz: 'O‘zbekiston va xorijdan',
      ru: 'из Узбекистана и зарубежья',
      en: 'across Uzbekistan & abroad',
    },
  },
  {
    id: 'articles',
    value: 30,
    suffix: '+',
    label: {
      uz: 'ilmiy maqola va qo‘llanma',
      ru: 'научных статей и пособий',
      en: 'articles, manuals & software',
    },
    context: {
      uz: 'Shuningdek “Ildiz” kitobi muallifi',
      ru: 'а также автор книги «Ildiz»',
      en: 'plus author of the book “Ildiz”',
    },
  },
  {
    id: 'associations',
    value: 5,
    suffix: '',
    label: {
      uz: 'xalqaro assotsiatsiya a’zosi',
      ru: 'международных обществ',
      en: 'international societies',
    },
    context: {
      uz: 'EPNS · EAN · WSO · AOPMC · DUKE',
      ru: 'EPNS · EAN · WSO · AOPMC · DUKE',
      en: 'EPNS · EAN · WSO · AOPMC · DUKE',
    },
  },
];

export const PUBLICATIONS: ScientificPublication[] = [
  {
    id: 'pub-1',
    category: 'epilepsy',
    year: 2024,
    journal: 'EPNS & Central Asian Pediatric Neurology Review',
    title: {
      uz: 'Erta yoshdagi bolalarda tungi Video-EEG markerlari orqali epileptik faollikni prognozlash',
      ru: 'Прогнозирование эпилептической активности у детей раннего возраста по ночным маркерам Видео-ЭЭГ',
      en: 'Nocturnal Video-EEG Biomarkers for Early Prognosis of Pediatric Epileptic Activity',
    },
    summary: {
      uz: 'Bolalar nevrologiyasi amaliyotida tungi uyqu bosqichlaridagi neyrofiziologik o‘zgarishlarni erta aniqlash orqali individual antiepileptik terapiya samaradorligini oshirish bo‘yicha klinik tahlil.',
      ru: 'Клинический анализ повышения эффективности индивидуальной противоэпилептической терапии за счёт раннего выявления нейрофизиологических изменений во сне.',
      en: 'Clinical analysis demonstrating improved individualized antiepileptic therapy outcomes through early identification of nocturnal sleep-stage EEG biomarkers.',
    },
    coAuthors: 'Z. N. Ismailov (DoctorZi)',
    doi: 'drzokhidjon.uz/articles/video-eeg',
  },
  {
    id: 'pub-2',
    category: 'neurodevelopment',
    year: 2023,
    journal: 'Tashkent Pediatric Medical Institute — Methodological Manual',
    title: {
      uz: 'Bolalarda nutq va psixomotor rivojlanish kechikishini erta neyroreabilitatsiya qilish uslubiy qo‘llanmasi',
      ru: 'Методическое пособие по ранней нейрореабилитации задержки речевого и психомоторного развития у детей',
      en: 'Methodological Manual on Early Neurorehabilitation for Pediatric Speech & Psychomotor Delay',
    },
    summary: {
      uz: 'Pediatrlar, bolalar nevropatologlari va reabilitologlar uchun neyroplastiklik davrida bosqichma-bosqich diagnostika va reabilitatsiya algoritmlari.',
      ru: 'Пошаговые алгоритмы диагностики и медицинской реабилитации в период нейропластичности для педиатров и детских неврологов.',
      en: 'Step-by-step diagnostic and medical rehabilitation protocols tailored for pediatricians and child neurologists during peak neuroplasticity.',
    },
    coAuthors: 'Z. N. Ismailov, PhD',
    doi: 'drzokhidjon.uz/manuals/neurorehab',
  },
  {
    id: 'pub-3',
    category: 'international',
    year: 2022,
    journal: 'EAN & World Stroke Organization (WSO) Symposium',
    title: {
      uz: 'Bolalarda serebrovaskulyar buzilishlar va migren fenotiplarini zamonaviy boshqarish strategiyalari',
      ru: 'Современные стратегии ведения цереброваскулярных нарушений и фенотипов мигрени у детей',
      en: 'Modern Management Strategies for Pediatric Cerebrovascular Disorders & Migraine Phenotypes',
    },
    summary: {
      uz: 'Xalqaro EPNS, EAN va WSO mezonlari asosida o‘smirlar bosh og‘rig‘i va qon-tomir patologiyalarini erta skrining qilish uchun yaratilgan tibbiy dasturiy yechim natijalari.',
      ru: 'Результаты внедрения медицинской диагностической программы раннего скрининга головной боли и сосудистых патологий по стандартам EPNS, EAN и WSO.',
      en: 'Outcomes of a clinical screening software framework aligned with EPNS, EAN, and WSO guidelines for pediatric headache and neurovascular care.',
    },
    coAuthors: 'Z. N. Ismailov · EPNS / EAN / WSO',
    doi: 'drzokhidjon.uz/research/ean-wso',
  },
  {
    id: 'pub-4',
    category: 'neurodevelopment',
    year: 2021,
    journal: 'Author Publication — “Ildiz” & Clinical Notes',
    title: {
      uz: '“Ildiz” kitobi hamda ota-onalar uchun bolalar asab tizimi salomatligi bo‘yicha ma’rifiy qo‘llanmalar',
      ru: 'Книга «Ildiz» и просветительские материалы для родителей о здоровье нервной системы ребёнка',
      en: '“Ildiz” (Book) & Parent Education Guides on Healthy Child Nervous System Development',
    },
    summary: {
      uz: 'Doktor Zokhidjon Ismailovning badiiy-hayotiy “Ildiz” asari hamda ota-onalarga bolaning sog‘lom o‘sishi, uyqusi va hissiy rivoji bo‘yicha amaliy tavsiyalar to‘plami.',
      ru: 'Авторская книга доктора Зохиджона Исмаилова «Ildiz» и практические рекомендации для родителей по гармоничному развитию нервной системы ребёнка.',
      en: 'Dr. Zokhidjon Ismailov’s published book “Ildiz” alongside accessible parent education guides on child brain development, sleep, and emotional growth.',
    },
    coAuthors: 'Zokhidjon Nurmanovich Ismailov',
    doi: 'drzokhidjon.uz/books/ildiz',
  },
];

export const TESTIMONIALS: TestimonialItem[] = [
  {
    id: 't-1',
    parentName: 'Dilnoza Abdullayeva',
    city: 'Toshkent',
    childProfile: {
      uz: 'O‘g‘li Amir, 6 yosh',
      ru: 'Сын Амир, 6 лет',
      en: 'Son Amir, age 6',
    },
    specialtyId: 'epilepsy',
    quote: {
      uz: 'Ikki yil davomida tungi tutqanoqlardan xavotirda edik. Doktor Zokhidjon Nurmanovich Video-EEG natijasini sinchiklab tahlil qilib, ortiqcha dorilarni bekor qildi va aniq monoterapiya belgiladi.',
      ru: 'Два года мы переживали из-за ночных приступов. Доктор Зохиджон Нурманович тщательно разобрал Видео-ЭЭГ, отменил лишние препараты и подобрал точную монотерапию.',
      en: 'For two years we worried every night about seizures. Dr. Zokhidjon Ismailov reviewed our Video-EEG in detail, removed unnecessary medications, and built a focused monotherapy plan.',
    },
    outcome: {
      uz: '14 oydan beri tutqanoqsiz barqaror remissiya',
      ru: '14 месяцев стабильной ремиссии без приступов',
      en: '14 months of continuous seizure-free remission',
    },
  },
  {
    id: 't-2',
    parentName: 'Rustamjon Qodirov',
    city: 'Samarqand',
    childProfile: {
      uz: 'Qizi Madina, 4 yosh',
      ru: 'Дочь Мадина, 4 года',
      en: 'Daughter Madina, age 4',
    },
    specialtyId: 'developmental',
    quote: {
      uz: 'Qizimiz 3 yoshida ham gapirmasdi. Doktor bizni xotirjam qilib, aniq neyroreabilitatsiya rejasini tuzib berdi — qaysi tekshiruv va mashg‘ulot haqiqatan zarurligini bosqichma-bosqich tushuntirdi.',
      ru: 'В 3 года дочка почти не говорила. Доктор спокойно составил чёткий план нейрореабилитации и пошагово объяснил, какие обследования и занятия действительно нужны.',
      en: 'At age 3 our daughter barely spoke. Dr. Ismailov calmed our fears and laid out a clear neurorehabilitation roadmap coordinating diagnostics and speech-motor therapy.',
    },
    outcome: {
      uz: '5 oy ichida to‘liq jumlalar bilan erkin muloqot',
      ru: 'Свободная фразовая речь через 5 месяцев',
      en: 'Conversational multi-word sentences within 5 months',
    },
  },
  {
    id: 't-3',
    parentName: 'Gulnora Mirzaeva',
    city: 'Toshkent',
    childProfile: {
      uz: 'O‘g‘li Sardor, 11 yosh',
      ru: 'Сын Сардор, 11 лет',
      en: 'Son Sardor, age 11',
    },
    specialtyId: 'migraine',
    quote: {
      uz: 'Haftada 3 marta kuchli bosh og‘rig‘i tufayli maktabni qoldirardi. Zamonaviy tashxis va profilaktika kursi natijasida o‘g‘limiz yana sport va darslarga to‘liq qaytdi.',
      ru: 'Из-за сильных головных болей 3 раза в неделю сын пропускал школу. После точной диагностики и курса профилактики он полностью вернулся к учёбе и спорту.',
      en: 'Severe headaches caused our son to miss school three times a week. Following trigger mapping and preventive therapy, he returned fully to school and swimming.',
    },
    outcome: {
      uz: 'Migren xurujlari oyiga 12 tadan 1 tagacha kamaydi',
      ru: 'Приступы мигрени сократились с 12 до 1 в месяц',
      en: 'Headache days reduced from 12 to 1 per month',
    },
  },
];

export const CAREER_MILESTONES: CareerMilestone[] = [
  {
    period: '2021 — 2026',
    title: {
      uz: 'DSc mustaqil tadqiqotchisi · Bolalar nevrologi va tibbiy reabilitolog',
      ru: 'Независимый соискатель DSc · Детский невролог и врач-реабилитолог',
      en: 'DSc Independent Researcher · Pediatric Neurologist & Rehabilitation Specialist',
    },
    institution: {
      uz: 'DoctorZi (drzokhidjon.uz) · EPNS, EAN, WSO, AOPMC va DUKE Health a’zosi',
      ru: 'DoctorZi (drzokhidjon.uz) · Член EPNS, EAN, WSO, AOPMC и DUKE Health',
      en: 'DoctorZi (drzokhidjon.uz) · Member of EPNS, EAN, WSO, AOPMC & DUKE Health',
    },
  },
  {
    period: '2020',
    title: {
      uz: 'Tibbiyot fanlari bo‘yicha falsafa doktori (PhD) · “Sog‘liqni saqlash a’lochisi” ko‘krak nishoni',
      ru: 'Доктор философии по медицинским наукам (PhD) · Знак «Отличник здравоохранения РУз»',
      en: 'PhD in Medical Sciences · “Excellence in Healthcare of Uzbekistan” Award',
    },
    institution: {
      uz: 'O‘zbekiston Respublikasi Sog‘liqni saqlash vazirligi',
      ru: 'Министерство здравоохранения Республики Узбекистан',
      en: 'Ministry of Health of the Republic of Uzbekistan',
    },
  },
  {
    period: '2007 — 2010',
    title: {
      uz: 'Bolalar nevropatologiyasi bo‘yicha magistratura',
      ru: 'Магистратура по детской невропатологии',
      en: 'Master’s Degree in Pediatric Neuropathology',
    },
    institution: {
      uz: 'Toshkent Pediatriya Tibbiyot Instituti (TashPMI)',
      ru: 'Ташкентский педиатрический медицинский институт (ТашПМИ)',
      en: 'Tashkent Pediatric Medical Institute',
    },
  },
  {
    period: '2007',
    title: {
      uz: 'Oliy tibbiy ta’lim — Pediatriya fakulteti (MD)',
      ru: 'Высшее медицинское образование — педиатрический факультет (MD)',
      en: 'Medical Degree (MD) in Pediatrics',
    },
    institution: {
      uz: 'Samarqand Davlat Tibbiyot Instituti',
      ru: 'Самаркандский государственный медицинский институт',
      en: 'Samarkand State Medical Institute',
    },
  },
];

export const UI_COPY: Record<
  Locale,
  {
    nav: {
      specialties: string;
      results: string;
      about: string;
      science: string;
      bookCta: string;
    };
    hero: {
      eyebrow: string;
      title: string;
      subtitle: string;
      expLabel: string;
      degreeLabel: string;
      primaryCta: string;
      secondaryCta: string;
      doctorRole: string;
      scrollHint: string;
    };
    brainSection: {
      heading: string;
      subheading: string;
      interactiveHint: string;
      regionPrefix: string;
      symptomsTitle: string;
      diagnosticsTitle: string;
      approachTitle: string;
      bookForSpecialty: string;
      controls: {
        autoOrbit: string;
        neuralLayers: string;
        resetView: string;
      };
    };
    statsSection: {
      heading: string;
      subheading: string;
      certificatesHeading: string;
      certificatesSubheading: string;
      openCertificate: string;
      openPdf: string;
      dragHint: string;
      pauseRotation: string;
      resumeRotation: string;
    };
    mediaSection: {
      aboutTitle: string;
      aboutSubtitle: string;
      aboutAction: string;
      scienceTitle: string;
      scienceSubtitle: string;
      scienceAction: string;
    };
    scienceModal: {
      title: string;
      subtitle: string;
      filters: {
        all: string;
        epilepsy: string;
        neurodevelopment: string;
        international: string;
      };
    };
    aboutModal: {
      title: string;
      duration: string;
      philosophyTitle: string;
      philosophyBody: string;
      timelineTitle: string;
      chapters: { time: string; label: string; caption: string }[];
    };
    booking: {
      heading: string;
      subheading: string;
      parentName: string;
      parentNamePlaceholder: string;
      phone: string;
      phonePlaceholder: string;
      childAge: string;
      childAgePlaceholder: string;
      specialty: string;
      format: string;
      formatClinic: string;
      formatOnline: string;
      date: string;
      timeSlot: string;
      notes: string;
      notesPlaceholder: string;
      submit: string;
      successTitle: string;
      successDesc: string;
      referenceCode: string;
      bookAnother: string;
      recentBookings: string;
      whatsapp: string;
      telegram: string;
      clinicAddressTitle: string;
      clinicAddress: string;
      hoursTitle: string;
      hoursValue: string;
      phonesTitle: string;
      errors: {
        name: string;
        phone: string;
        age: string;
        date: string;
      };
    };
    footer: {
      rights: string;
      location: string;
    };
  }
> = {
  uz: {
    nav: {
      specialties: 'Yo‘nalishlar',
      results: 'Natijalar',
      about: 'Doktor haqida',
      science: 'Ilmiy faoliyat',
      bookCta: 'Qabulga yozilish',
    },
    hero: {
      eyebrow: 'Dr. Zokhidjon Nurmanovich Ismailov · MD, PhD, DSc (DoctorZi)',
      title: 'Bolalar nevrologiyasi',
      subtitle: 'Bola miyasining sog‘lom rivoji — baxtli kelajak poydevori',
      expLabel: '19+ yillik klinik tajriba',
      degreeLabel: 'PhD · DSc tadqiqotchi · EPNS',
      primaryCta: 'Qabulga yozilish',
      secondaryCta: 'Doktor haqida (1:20)',
      doctorRole: 'Bolalar nevrologi va tibbiy reabilitolog · PhD',
      scrollHint: '3D neyro-xaritani ko‘rish uchun pastga aylantiring',
    },
    brainSection: {
      heading: 'Asosiy nevrologik yo‘nalishlar',
      subheading:
        'Yo‘nalishni tanlang — 3D golografik miya modeli tegishli neyron markazini va klinik yondashuvni ko‘rsatadi.',
      interactiveHint: '3D modelni barmoq yoki sichqoncha bilan aylantiring',
      regionPrefix: 'Neyron hududi',
      symptomsTitle: 'E’tibor berish lozim bo‘lgan belgilar',
      diagnosticsTitle: 'Diagnostika standartlari',
      approachTitle: 'Klinik yondashuv',
      bookForSpecialty: 'Ushbu yo‘nalish bo‘yicha qabulga yozilish',
      controls: {
        autoOrbit: 'Avto-aylanish',
        neuralLayers: 'Qatlamlar',
        resetView: 'Tiklash',
      },
    },
    statsSection: {
      heading: 'Raqamlarda isbotlangan ishonch',
      subheading:
        'Dalillarga asoslangan bolalar nevrologiyasi, tibbiy reabilitatsiya va xalqaro EPNS, EAN, WSO standartlari.',
      certificatesHeading: 'Rasmiy sertifikatlar va mualliflik guvohnomalari',
      certificatesSubheading:
        'Xalqaro EPNS malaka hujjatlari, Sog‘liqni saqlash vazirligi sertifikati va davlat mualliflik guvohnomalari.',
      openCertificate: 'Hujjatni kattalashtirish',
      openPdf: 'Asl PDF hujjatni ochish',
      dragHint: 'Aylantirish uchun suring yoki hujjat ustiga bosing',
      pauseRotation: 'To‘xtatish',
      resumeRotation: 'Aylantirish',
    },
    mediaSection: {
      aboutTitle: 'Doktor haqida',
      aboutSubtitle: 'Video tanishuv · YouTube · DoctorZi',
      aboutAction: 'Tanishuvni ko‘rish',
      scienceTitle: 'Ilmiy faoliyat',
      scienceSubtitle: '30+ maqola, qo‘llanmalar, dasturlar va “Ildiz” kitobi',
      scienceAction: 'Tadqiqotlarni ochish',
    },
    scienceModal: {
      title: 'Ilmiy maqolalar, qo‘llanmalar va kitoblar',
      subtitle: 'Dr. Zokhidjon Ismailovning bolalar nevrologiyasi va reabilitatsiya bo‘yicha nashrlari',
      filters: {
        all: 'Barchasi',
        epilepsy: 'Epilepsiya',
        neurodevelopment: 'Neyrorivojlanish',
        international: 'Xalqaro',
      },
    },
    aboutModal: {
      title: 'Dr. Zokhidjon Nurmanovich Ismailov — Tanishuv',
      duration: '1:20',
      philosophyTitle: 'Klinik falsafa',
      philosophyBody:
        'Har bir bola miyasi o‘ziga xos ritmda rivojlanadi. Mening asosiy tamoyilim — ota-onalarga qo‘rquv emas, aniq dalillarga asoslangan tashxis, ortiqcha dorilarsiz xavfsiz davolash va samarali tibbiy reabilitatsiya rejasini berishdir.',
      timelineTitle: 'Ta’lim va klinik yo‘l',
      chapters: [
        {
          time: '0:00',
          label: 'Bola miyasining oltin davri',
          caption: 'Erta tashxis va neyroplastiklik davrida to‘g‘ri reabilitatsiyaning ahamiyati.',
        },
        {
          time: '0:28',
          label: 'Xalqaro standartlar (EPNS · EAN)',
          caption: 'Video-EEG, neyrosonografiya va xalqaro klinik protokollar asosida tekshiruv.',
        },
        {
          time: '0:54',
          label: 'Oila bilan hamkorlik',
          caption: 'Ota-onalar uchun tushunarli yo‘l xaritasi va har bir bosqichda aloqada bo‘lish.',
        },
      ],
    },
    booking: {
      heading: 'Qabulga oldindan yozilish',
      subheading:
        'Qabul faqat oldindan yozilish asosida amalga oshiriladi. Qulay vaqtni tanlang — administrator tasdiqlash uchun bog‘lanadi.',
      parentName: 'Ota-ona ism-sharifi',
      parentNamePlaceholder: 'Masalan, Dilnoza Karimova',
      phone: 'Telefon raqami',
      phonePlaceholder: '+998 33 420 88 48',
      childAge: 'Bolaning yoshi',
      childAgePlaceholder: 'Masalan, 4 yosh yoki 8 oylik',
      specialty: 'Murojaat yo‘nalishi',
      format: 'Qabul formati',
      formatClinic: 'Klinikada qabul (Farobiy, 415)',
      formatOnline: 'Onlayn video-konsultatsiya',
      date: 'Qulay sana',
      timeSlot: 'Qabul vaqti',
      notes: 'Qisqacha shikoyat yoki savol (ixtiyoriy)',
      notesPlaceholder: 'Asosiy belgilar yoki avvalgi tekshiruvlar haqida yozing...',
      submit: 'Qabulga yozilish',
      successTitle: 'So‘rovingiz muvaffaqiyatli qabul qilindi',
      successDesc: 'Klinika administratori tanlangan vaqtni tasdiqlash uchun tez orada siz bilan bog‘lanadi.',
      referenceCode: 'Buyurtma raqami',
      bookAnother: 'Yangi qabulga yozilish',
      recentBookings: 'Sizning oxirgi so‘rovlaringiz',
      whatsapp: 'WhatsApp',
      telegram: 'Telegram @drzokhidjon',
      clinicAddressTitle: 'Klinika manzili',
      clinicAddress: 'Toshkent sh., Olmazor tumani, Farobiy ko‘chasi, 415-uy',
      hoursTitle: 'Qabul vaqti (oldindan yozilish bilan)',
      hoursValue: 'Du–Ju: 13:00 – 18:00 · Shanba: 09:00 – 13:00',
      phonesTitle: 'Aloqa raqamlari',
      errors: {
        name: 'Iltimos, ism-sharifingizni kiriting',
        phone: 'To‘g‘ri telefon raqamini kiriting (kamida 9 ta raqam)',
        age: 'Bolaning yoshini ko‘rsating',
        date: 'Qabul sanasini tanlang',
      },
    },
    footer: {
      rights: 'Barcha huquqlar himoyalangan',
      location: 'Farobiy 415, Olmazor, Toshkent',
    },
  },
  ru: {
    nav: {
      specialties: 'Направления',
      results: 'Результаты',
      about: 'О докторе',
      science: 'Наука',
      bookCta: 'Записаться',
    },
    hero: {
      eyebrow: 'Др. Зохиджон Нурманович Исмаилов · MD, PhD, DSc (DoctorZi)',
      title: 'Детская неврология',
      subtitle: 'Здоровое развитие мозга ребёнка — фундамент счастливого будущего',
      expLabel: '19+ лет клинического опыта',
      degreeLabel: 'PhD · соискатель DSc · EPNS',
      primaryCta: 'Записаться на приём',
      secondaryCta: 'О докторе (1:20)',
      doctorRole: 'Детский невролог и врач-реабилитолог · PhD',
      scrollHint: 'Прокрутите вниз к интерактивной 3D нейро-карте',
    },
    brainSection: {
      heading: 'Ключевые направления неврологии',
      subheading:
        'Выберите направление — 3D голографическая модель мозга выделит соответствующий нейроцентр и клинический протокол.',
      interactiveHint: 'Вращайте 3D-модель касанием или мышью',
      regionPrefix: 'Нейрозона',
      symptomsTitle: 'На что важно обратить внимание',
      diagnosticsTitle: 'Стандарты диагностики',
      approachTitle: 'Клинический подход',
      bookForSpecialty: 'Записаться по этому направлению',
      controls: {
        autoOrbit: 'Авто',
        neuralLayers: 'Слои',
        resetView: 'Сброс',
      },
    },
    statsSection: {
      heading: 'Доверие, подтверждённое результатами',
      subheading:
        'Доказательная детская неврология, медицинская реабилитация и международные стандарты EPNS, EAN, WSO.',
      certificatesHeading: 'Официальные сертификаты и авторские свидетельства',
      certificatesSubheading:
        'Международные сертификаты EPNS, квалификация Минздрава РУз и государственные свидетельства интеллектуальной собственности.',
      openCertificate: 'Увеличить документ',
      openPdf: 'Открыть оригинал PDF',
      dragHint: 'Проведите для вращения или нажмите на сертификат',
      pauseRotation: 'Пауза',
      resumeRotation: 'Вращать',
    },
    mediaSection: {
      aboutTitle: 'О докторе',
      aboutSubtitle: 'Видеознакомство · YouTube · DoctorZi',
      aboutAction: 'Смотреть обращение',
      scienceTitle: 'Научная деятельность',
      scienceSubtitle: '30+ статей, пособия, программы и книга «Ildiz»',
      scienceAction: 'Открыть публикации',
    },
    scienceModal: {
      title: 'Научные публикации, пособия и книги',
      subtitle: 'Избранные труды д-ра Зохиджона Исмаилова по детской неврологии и реабилитации',
      filters: {
        all: 'Все',
        epilepsy: 'Эпилепсия',
        neurodevelopment: 'Нейроразвитие',
        international: 'Международные',
      },
    },
    aboutModal: {
      title: 'Др. Зохиджон Нурманович Исмаилов — О докторе',
      duration: '1:20',
      philosophyTitle: 'Клиническая философия',
      philosophyBody:
        'Мозг каждого ребёнка развивается в собственном ритме. Мой принцип — давать родителям не тревогу, а точный доказательный диагноз, безопасную терапию без лишних назначений и понятную программу медицинской реабилитации.',
      timelineTitle: 'Образование и клинический путь',
      chapters: [
        {
          time: '0:00',
          label: 'Золотое окно нейропластичности',
          caption: 'Значение ранней диагностики и своевременной нейрореабилитации у детей.',
        },
        {
          time: '0:28',
          label: 'Международные стандарты (EPNS · EAN)',
          caption: 'Видео-ЭЭГ, нейросонография и доказательные клинические протоколы.',
        },
        {
          time: '0:54',
          label: 'Партнёрство с семьёй',
          caption: 'Прозрачный план наблюдения и поддержка на каждом этапе лечения.',
        },
      ],
    },
    booking: {
      heading: 'Предварительная запись на приём',
      subheading:
        'Приём ведётся по предварительной записи. Выберите удобное время — администратор свяжется для подтверждения.',
      parentName: 'ФИО родителя',
      parentNamePlaceholder: 'Например, Дилноза Каримова',
      phone: 'Номер телефона',
      phonePlaceholder: '+998 33 420 88 48',
      childAge: 'Возраст ребёнка',
      childAgePlaceholder: 'Например, 4 года или 8 месяцев',
      specialty: 'Направление обращения',
      format: 'Формат консультации',
      formatClinic: 'Очный приём (ул. Фаробий, 415)',
      formatOnline: 'Онлайн видео-консультация',
      date: 'Предпочтительная дата',
      timeSlot: 'Время приёма',
      notes: 'Краткое описание жалоб (необязательно)',
      notesPlaceholder: 'Укажите основные симптомы или предыдущие обследования...',
      submit: 'Записаться на приём',
      successTitle: 'Ваша заявка успешно принята',
      successDesc: 'Администратор клиники свяжется с вами в ближайшее время для подтверждения записи.',
      referenceCode: 'Номер записи',
      bookAnother: 'Создать новую запись',
      recentBookings: 'Ваши последние заявки',
      whatsapp: 'WhatsApp',
      telegram: 'Telegram @drzokhidjon',
      clinicAddressTitle: 'Адрес клиники',
      clinicAddress: 'г. Ташкент, Алмазарский район, ул. Фаробий, дом 415',
      hoursTitle: 'Часы приёма (по записи)',
      hoursValue: 'Пн–Пт: 13:00 – 18:00 · Суббота: 09:00 – 13:00',
      phonesTitle: 'Контактные телефоны',
      errors: {
        name: 'Пожалуйста, введите ваше имя',
        phone: 'Введите корректный номер телефона (минимум 9 цифр)',
        age: 'Укажите возраст ребёнка',
        date: 'Выберите дату приёма',
      },
    },
    footer: {
      rights: 'Все права защищены',
      location: 'ул. Фаробий 415, Алмазар, Ташкент',
    },
  },
  en: {
    nav: {
      specialties: 'Specialties',
      results: 'Outcomes',
      about: 'About',
      science: 'Research',
      bookCta: 'Book Visit',
    },
    hero: {
      eyebrow: 'Dr. Zokhidjon Nurmanovich Ismailov · MD, PhD, DSc (DoctorZi)',
      title: 'Pediatric Neurology',
      subtitle: 'Healthy child brain development — the foundation of a bright future',
      expLabel: '19+ years clinical practice',
      degreeLabel: 'PhD · DSc Researcher · EPNS',
      primaryCta: 'Book Appointment',
      secondaryCta: 'Meet the Doctor (1:20)',
      doctorRole: 'Pediatric Neurologist & Rehabilitation Specialist · PhD',
      scrollHint: 'Scroll to explore the 3D holographic brain map',
    },
    brainSection: {
      heading: 'Core Pediatric Neurology Focus',
      subheading:
        'Select any condition to illuminate its neural center on the interactive 3D holographic brain and review our clinical protocol.',
      interactiveHint: 'Drag with finger or mouse to rotate the 3D chamber',
      regionPrefix: 'Neural Region',
      symptomsTitle: 'Key signs to watch for',
      diagnosticsTitle: 'Diagnostic standards',
      approachTitle: 'Clinical approach',
      bookForSpecialty: 'Book consultation for this specialty',
      controls: {
        autoOrbit: 'Auto',
        neuralLayers: 'Layers',
        resetView: 'Reset',
      },
    },
    statsSection: {
      heading: 'Proven Clinical Impact',
      subheading:
        'Evidence-based pediatric neurology, medical rehabilitation, and international EPNS, EAN, WSO & DUKE Health standards.',
      certificatesHeading: 'Official Certificates & Copyright Credentials',
      certificatesSubheading:
        'International EPNS accreditation, Ministry of Health continuing medical education, and state intellectual property certificates.',
      openCertificate: 'Inspect document',
      openPdf: 'Open original PDF',
      dragHint: 'Drag to spin or tap any certificate to inspect',
      pauseRotation: 'Pause',
      resumeRotation: 'Rotate',
    },
    mediaSection: {
      aboutTitle: 'About the Doctor',
      aboutSubtitle: 'Video introduction · YouTube · DoctorZi',
      aboutAction: 'Watch introduction',
      scienceTitle: 'Scientific Research',
      scienceSubtitle: '30+ articles, manuals, software & the book “Ildiz”',
      scienceAction: 'Explore publications',
    },
    scienceModal: {
      title: 'Scientific Publications, Manuals & Books',
      subtitle: 'Selected works by Dr. Zokhidjon Ismailov in pediatric neurology and medical rehabilitation',
      filters: {
        all: 'All',
        epilepsy: 'Epilepsy',
        neurodevelopment: 'Neurodevelopment',
        international: 'International',
      },
    },
    aboutModal: {
      title: 'Dr. Zokhidjon Nurmanovich Ismailov — Introduction',
      duration: '1:20',
      philosophyTitle: 'Clinical Philosophy',
      philosophyBody:
        'Every child’s brain develops on its own timeline. My commitment is to replace parental anxiety with evidence-based clarity, minimalist safe therapy, and an individualized medical rehabilitation roadmap.',
      timelineTitle: 'Education & Clinical Milestones',
      chapters: [
        {
          time: '0:00',
          label: 'The Golden Window of Neuroplasticity',
          caption: 'Why early neurological assessment and timely rehabilitation unlock lasting potential.',
        },
        {
          time: '0:28',
          label: 'International Standards (EPNS · EAN)',
          caption: 'Video-EEG, cranial neurosonography, and European Paediatric Neurology Society guidelines.',
        },
        {
          time: '0:54',
          label: 'Partnering With Parents',
          caption: 'Clear home milestones and transparent follow-up at every stage.',
        },
      ],
    },
    booking: {
      heading: 'Book by Prior Appointment',
      subheading:
        'Consultations are scheduled in advance. Choose a convenient date and time — our coordinator will confirm your slot promptly.',
      parentName: 'Parent full name',
      parentNamePlaceholder: 'e.g., Dilnoza Karimova',
      phone: 'Phone number',
      phonePlaceholder: '+998 33 420 88 48',
      childAge: 'Child’s age',
      childAgePlaceholder: 'e.g., 4 years or 8 months',
      specialty: 'Neurological concern',
      format: 'Consultation format',
      formatClinic: 'In-clinic visit (415 Farobiy St)',
      formatOnline: 'Online video consultation',
      date: 'Preferred date',
      timeSlot: 'Time slot',
      notes: 'Brief symptoms or notes (optional)',
      notesPlaceholder: 'Share key symptoms or prior EEG/MRI evaluations...',
      submit: 'Confirm Booking Request',
      successTitle: 'Booking request received',
      successDesc: 'Our clinic coordinator will reach out shortly to confirm your appointment slot.',
      referenceCode: 'Reference code',
      bookAnother: 'Book another appointment',
      recentBookings: 'Your recent requests',
      whatsapp: 'WhatsApp',
      telegram: 'Telegram @drzokhidjon',
      clinicAddressTitle: 'Clinic location',
      clinicAddress: '415 Farobiy Street, Almazar District, Tashkent, Uzbekistan',
      hoursTitle: 'Consultation hours (by appointment)',
      hoursValue: 'Mon–Fri: 13:00 – 18:00 · Saturday: 09:00 – 13:00',
      phonesTitle: 'Direct phone lines',
      errors: {
        name: 'Please enter the parent’s full name',
        phone: 'Please enter a valid phone number (at least 9 digits)',
        age: 'Please provide the child’s age',
        date: 'Please select a preferred date',
      },
    },
    footer: {
      rights: 'All rights reserved',
      location: '415 Farobiy St, Almazar, Tashkent',
    },
  },
};
