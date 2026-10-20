import type { Currency, Diet, EducationLevel, ProfessionCategory } from '@tdc/shared';

/**
 * Fictional data pools. Names are common Indian given names and surnames combined at random —
 * they do not describe real people. Company names are invented; colleges are well-known public
 * institutions used only as education labels.
 */

export interface CulturalGroup {
  key: string;
  weight: number;
  religion: string;
  communities: { name: string; sub: string[] }[];
  surnames: string[];
  male: string[];
  female: string[];
  motherTongue: string;
  languages: string[];
  cities: string[];
  vegetarianBias: number;
}

export const GROUPS: CulturalGroup[] = [
  {
    key: 'north',
    weight: 16,
    religion: 'Hindu',
    communities: [
      { name: 'Brahmin', sub: ['Gaur', 'Saraswat'] },
      { name: 'Khatri', sub: ['Kapoor', 'Malhotra'] },
      { name: 'Agarwal', sub: [] },
      { name: 'Kayastha', sub: ['Srivastava', 'Mathur'] },
    ],
    surnames: [
      'Sharma',
      'Verma',
      'Gupta',
      'Malhotra',
      'Kapoor',
      'Khanna',
      'Arora',
      'Agarwal',
      'Srivastava',
      'Mathur',
      'Saxena',
      'Bhatia',
      'Sethi',
      'Tandon',
    ],
    male: [
      'Aarav',
      'Kabir',
      'Rohit',
      'Siddharth',
      'Varun',
      'Karan',
      'Nikhil',
      'Abhishek',
      'Ankit',
      'Gaurav',
      'Mohit',
      'Pranav',
    ],
    female: [
      'Aditi',
      'Ishita',
      'Nidhi',
      'Pooja',
      'Riya',
      'Shreya',
      'Tanya',
      'Kritika',
      'Neha',
      'Sakshi',
      'Divya',
      'Ritika',
    ],
    motherTongue: 'Hindi',
    languages: ['Hindi', 'English'],
    cities: ['Delhi', 'Lucknow', 'Jaipur', 'Chandigarh', 'Mumbai', 'Bengaluru', 'Pune'],
    vegetarianBias: 0.35,
  },
  {
    key: 'punjabi',
    weight: 7,
    religion: 'Sikh',
    communities: [
      { name: 'Jat Sikh', sub: [] },
      { name: 'Khatri Sikh', sub: [] },
      { name: 'Ramgarhia', sub: [] },
    ],
    surnames: ['Gill', 'Sandhu', 'Grewal', 'Dhillon', 'Bedi', 'Bajwa', 'Sidhu', 'Ahluwalia'],
    male: ['Harjot', 'Gurpreet', 'Jaskaran', 'Arjan', 'Manveer', 'Ishaan', 'Navdeep'],
    female: ['Simran', 'Harleen', 'Jasleen', 'Navneet', 'Gurleen', 'Mehak', 'Amrit'],
    motherTongue: 'Punjabi',
    languages: ['Punjabi', 'Hindi', 'English'],
    cities: ['Chandigarh', 'Delhi', 'Mumbai', 'Bengaluru'],
    vegetarianBias: 0.3,
  },
  {
    key: 'gujarati',
    weight: 8,
    religion: 'Hindu',
    communities: [
      { name: 'Patel', sub: ['Leuva', 'Kadva'] },
      { name: 'Vaishnav Vanik', sub: [] },
      { name: 'Brahmin', sub: ['Nagar'] },
    ],
    surnames: ['Patel', 'Shah', 'Desai', 'Mehta', 'Parekh', 'Trivedi', 'Bhatt', 'Thakkar', 'Vyas'],
    male: ['Dhruv', 'Harsh', 'Jay', 'Parth', 'Rushil', 'Viraj', 'Yash', 'Krish'],
    female: ['Riddhi', 'Khushi', 'Hetal', 'Jinal', 'Mansi', 'Nirali', 'Pooja', 'Dhara'],
    motherTongue: 'Gujarati',
    languages: ['Gujarati', 'Hindi', 'English'],
    cities: ['Ahmedabad', 'Mumbai', 'Pune', 'Bengaluru'],
    vegetarianBias: 0.75,
  },
  {
    key: 'jain',
    weight: 4,
    religion: 'Jain',
    communities: [
      { name: 'Shwetambar', sub: [] },
      { name: 'Digambar', sub: [] },
    ],
    surnames: ['Jain', 'Shah', 'Doshi', 'Sanghvi', 'Kothari', 'Bafna'],
    male: ['Anmol', 'Chirag', 'Deep', 'Saket', 'Vardhan', 'Rishabh'],
    female: ['Anushka', 'Kriti', 'Palak', 'Sanya', 'Vidhi', 'Kashish'],
    motherTongue: 'Hindi',
    languages: ['Hindi', 'Gujarati', 'English'],
    cities: ['Mumbai', 'Ahmedabad', 'Jaipur', 'Delhi'],
    vegetarianBias: 0.97,
  },
  {
    key: 'marathi',
    weight: 9,
    religion: 'Hindu',
    communities: [
      { name: 'Maratha', sub: ['96 Kuli'] },
      { name: 'Deshastha Brahmin', sub: [] },
      { name: 'CKP', sub: [] },
    ],
    surnames: [
      'Kulkarni',
      'Deshpande',
      'Joshi',
      'Patil',
      'Pawar',
      'Gokhale',
      'Apte',
      'Jadhav',
      'Bhosale',
      'Sathe',
    ],
    male: ['Aniket', 'Omkar', 'Sahil', 'Tejas', 'Saurabh', 'Mihir', 'Chinmay', 'Atharva'],
    female: ['Gauri', 'Mrunal', 'Rutuja', 'Sayali', 'Shruti', 'Ketaki', 'Sneha', 'Prajakta'],
    motherTongue: 'Marathi',
    languages: ['Marathi', 'Hindi', 'English'],
    cities: ['Pune', 'Mumbai', 'Bengaluru', 'Hyderabad'],
    vegetarianBias: 0.4,
  },
  {
    key: 'tamil',
    weight: 8,
    religion: 'Hindu',
    communities: [
      { name: 'Iyer', sub: ['Vadama'] },
      { name: 'Iyengar', sub: [] },
      { name: 'Mudaliar', sub: [] },
      { name: 'Chettiar', sub: [] },
    ],
    surnames: ['Iyer', 'Krishnan', 'Subramanian', 'Venkatesh', 'Raghavan', 'Natarajan', 'Sundaram', 'Ramesh'],
    male: ['Karthik', 'Arvind', 'Vignesh', 'Hari', 'Srinivas', 'Ashwin', 'Pradeep', 'Sanjay'],
    female: ['Lakshmi', 'Divya', 'Janani', 'Keerthana', 'Priyanka', 'Swathi', 'Meenakshi', 'Aishwarya'],
    motherTongue: 'Tamil',
    languages: ['Tamil', 'English'],
    cities: ['Chennai', 'Bengaluru', 'Hyderabad', 'Mumbai'],
    vegetarianBias: 0.55,
  },
  {
    key: 'telugu',
    weight: 7,
    religion: 'Hindu',
    communities: [
      { name: 'Reddy', sub: [] },
      { name: 'Kamma', sub: [] },
      { name: 'Brahmin', sub: ['Niyogi'] },
    ],
    surnames: ['Reddy', 'Rao', 'Naidu', 'Chowdary', 'Varma', 'Prasad', 'Murthy'],
    male: ['Vikram', 'Sai', 'Teja', 'Charan', 'Rakesh', 'Kiran', 'Akhil'],
    female: ['Sravani', 'Harika', 'Sindhu', 'Bhavana', 'Deepika', 'Mounika', 'Tejaswi'],
    motherTongue: 'Telugu',
    languages: ['Telugu', 'English', 'Hindi'],
    cities: ['Hyderabad', 'Bengaluru', 'Chennai'],
    vegetarianBias: 0.25,
  },
  {
    key: 'kannada',
    weight: 5,
    religion: 'Hindu',
    communities: [
      { name: 'Vokkaliga', sub: [] },
      { name: 'Lingayat', sub: [] },
      { name: 'Brahmin', sub: ['Madhwa'] },
    ],
    surnames: ['Hegde', 'Shetty', 'Gowda', 'Bhat', 'Kamath', 'Rao', 'Acharya'],
    male: ['Prajwal', 'Shreyas', 'Nikhil', 'Rakshith', 'Sumanth', 'Varun'],
    female: ['Ananya', 'Kavya', 'Ramya', 'Shwetha', 'Spoorthi', 'Bhoomika'],
    motherTongue: 'Kannada',
    languages: ['Kannada', 'English', 'Hindi'],
    cities: ['Bengaluru', 'Pune', 'Hyderabad'],
    vegetarianBias: 0.45,
  },
  {
    key: 'malayali',
    weight: 5,
    religion: 'Hindu',
    communities: [
      { name: 'Nair', sub: [] },
      { name: 'Ezhava', sub: [] },
      { name: 'Menon', sub: [] },
    ],
    surnames: ['Nair', 'Menon', 'Pillai', 'Kurup', 'Warrier', 'Panicker'],
    male: ['Arjun', 'Rahul', 'Vishnu', 'Gokul', 'Anand', 'Sreejith'],
    female: ['Meera', 'Anjali', 'Parvathy', 'Gayathri', 'Nandana', 'Devika'],
    motherTongue: 'Malayalam',
    languages: ['Malayalam', 'English'],
    cities: ['Bengaluru', 'Chennai', 'Mumbai'],
    vegetarianBias: 0.15,
  },
  {
    key: 'bengali',
    weight: 6,
    religion: 'Hindu',
    communities: [
      { name: 'Brahmin', sub: [] },
      { name: 'Kayastha', sub: [] },
      { name: 'Vaidya', sub: [] },
    ],
    surnames: ['Banerjee', 'Chatterjee', 'Mukherjee', 'Das', 'Bose', 'Sen', 'Ghosh', 'Dutta'],
    male: ['Arnab', 'Debashish', 'Sayan', 'Ritwik', 'Sourav', 'Anirban', 'Aniket'],
    female: ['Ishani', 'Moumita', 'Rimjhim', 'Sohini', 'Trisha', 'Ananya', 'Payel'],
    motherTongue: 'Bengali',
    languages: ['Bengali', 'English', 'Hindi'],
    cities: ['Delhi', 'Bengaluru', 'Mumbai', 'Pune', 'Kolkata'],
    vegetarianBias: 0.1,
  },
  {
    key: 'muslim',
    weight: 8,
    religion: 'Muslim',
    communities: [
      { name: 'Sunni', sub: [] },
      { name: 'Shia', sub: [] },
    ],
    surnames: ['Khan', 'Siddiqui', 'Qureshi', 'Ansari', 'Shaikh', 'Mirza', 'Hussain', 'Rizvi'],
    male: ['Ayaan', 'Faraz', 'Imran', 'Zaid', 'Saif', 'Rehan', 'Arif', 'Danish'],
    female: ['Ayesha', 'Fatima', 'Sana', 'Zoya', 'Mehreen', 'Alina', 'Rukhsar', 'Nazia'],
    motherTongue: 'Urdu',
    languages: ['Urdu', 'Hindi', 'English'],
    cities: ['Lucknow', 'Hyderabad', 'Mumbai', 'Delhi', 'Bengaluru'],
    vegetarianBias: 0.05,
  },
  {
    key: 'christian',
    weight: 5,
    religion: 'Christian',
    communities: [
      { name: 'Catholic', sub: [] },
      { name: 'Protestant', sub: [] },
      { name: 'Syrian Christian', sub: [] },
    ],
    surnames: ["D'Souza", 'Fernandes', 'Pereira', 'Thomas', 'George', 'Mathew', 'Rodrigues', 'Joseph'],
    male: ['Aaron', 'Joel', 'Kevin', 'Neil', 'Ryan', 'Sharon', 'Allen'],
    female: ['Ancy', 'Christina', 'Elaine', 'Maria', 'Nicole', 'Sneha', 'Tina'],
    motherTongue: 'English',
    languages: ['English', 'Hindi'],
    cities: ['Mumbai', 'Bengaluru', 'Chennai', 'Pune'],
    vegetarianBias: 0.05,
  },
];

export interface ProfessionSpec {
  profession: string;
  category: ProfessionCategory;
  designations: string[];
  companies: string[];
  /** Annual income range in lakh INR. */
  incomeLakh: [number, number];
  degrees: { degree: string; level: EducationLevel; field: string; colleges: string[] }[];
  weight: number;
}

const TECH_COLLEGES = [
  'IIT Bombay',
  'IIT Delhi',
  'BITS Pilani',
  'NIT Trichy',
  'IIIT Hyderabad',
  'College of Engineering Pune',
  'VIT Vellore',
  'RV College of Engineering',
];
const MBA_COLLEGES = [
  'IIM Ahmedabad',
  'IIM Bangalore',
  'ISB Hyderabad',
  'XLRI Jamshedpur',
  'FMS Delhi',
  'SPJIMR Mumbai',
];
const MED_COLLEGES = [
  'AIIMS Delhi',
  'CMC Vellore',
  'Grant Medical College Mumbai',
  'Kasturba Medical College Manipal',
  'Madras Medical College',
];
const COMMERCE_COLLEGES = [
  'SRCC Delhi',
  "St. Xavier's College Mumbai",
  'Christ University Bengaluru',
  'Loyola College Chennai',
];
const LAW_COLLEGES = ['NLSIU Bengaluru', 'NALSAR Hyderabad', 'NLU Delhi', 'ILS Law College Pune'];
const DESIGN_COLLEGES = ['NID Ahmedabad', 'NIFT Delhi', 'Srishti Institute Bengaluru', 'IDC IIT Bombay'];
const ARTS_COLLEGES = [
  'Delhi University',
  'Presidency University Kolkata',
  'Fergusson College Pune',
  'JNU Delhi',
];

export const PROFESSIONS: ProfessionSpec[] = [
  {
    profession: 'Software Engineer',
    category: 'technology',
    designations: [
      'Senior Software Engineer',
      'Staff Engineer',
      'Engineering Manager',
      'Software Engineer II',
    ],
    companies: ['Zentrix Software', 'CloudNine Systems', 'Banyan Cloud', 'Quantica Tech', 'Orbitrail Labs'],
    incomeLakh: [14, 55],
    degrees: [
      {
        degree: 'B.Tech, Computer Science',
        level: 'bachelors',
        field: 'Computer Science',
        colleges: TECH_COLLEGES,
      },
      {
        degree: 'M.Tech, Computer Science',
        level: 'masters',
        field: 'Computer Science',
        colleges: TECH_COLLEGES,
      },
    ],
    weight: 16,
  },
  {
    profession: 'Product Manager',
    category: 'technology',
    designations: ['Product Manager', 'Senior Product Manager', 'Group Product Manager'],
    companies: ['Zentrix Software', 'Lumen Data Labs', 'Banyan Cloud', 'Tiffin Trails'],
    incomeLakh: [25, 70],
    degrees: [{ degree: 'MBA', level: 'masters', field: 'Business Administration', colleges: MBA_COLLEGES }],
    weight: 7,
  },
  {
    profession: 'Data Scientist',
    category: 'technology',
    designations: ['Data Scientist', 'Senior Data Scientist', 'ML Engineer'],
    companies: ['Lumen Data Labs', 'Quantica Tech', 'Meridian Bank'],
    incomeLakh: [16, 48],
    degrees: [
      {
        degree: 'M.Sc, Statistics',
        level: 'masters',
        field: 'Statistics',
        colleges: ['ISI Kolkata', 'Delhi University', 'IIT Bombay'],
      },
      {
        degree: 'PhD, Machine Learning',
        level: 'doctorate',
        field: 'Machine Learning',
        colleges: ['IISc Bengaluru', 'IIT Delhi'],
      },
    ],
    weight: 5,
  },
  {
    profession: 'Doctor',
    category: 'medicine',
    designations: [
      'Consultant Paediatrician',
      'Resident Physician',
      'Consultant Cardiologist',
      'Orthopaedic Surgeon',
      'Dermatologist',
      'Anaesthesiologist',
    ],
    companies: ['Sanjeevani Hospitals', 'CareAxis Clinics', 'Arogya Multispeciality', 'Medinova Institute'],
    incomeLakh: [12, 60],
    degrees: [
      { degree: 'MBBS, MD', level: 'professional', field: 'Medicine', colleges: MED_COLLEGES },
      { degree: 'MBBS, MS', level: 'professional', field: 'Surgery', colleges: MED_COLLEGES },
    ],
    weight: 9,
  },
  {
    profession: 'Dentist',
    category: 'medicine',
    designations: ['Dental Surgeon', 'Orthodontist'],
    companies: ['SmileCraft Dental', 'CareAxis Clinics'],
    incomeLakh: [8, 28],
    degrees: [
      {
        degree: 'BDS',
        level: 'professional',
        field: 'Dentistry',
        colleges: ['Manipal College of Dental Sciences', 'Maulana Azad Institute of Dental Sciences'],
      },
    ],
    weight: 3,
  },
  {
    profession: 'Chartered Accountant',
    category: 'finance',
    designations: ['Senior Manager – Audit', 'Finance Controller', 'Tax Consultant'],
    companies: ['Kestrel Advisors', 'Meridian & Co.', 'Indus Ridge Capital'],
    incomeLakh: [12, 40],
    degrees: [
      { degree: 'B.Com, CA', level: 'professional', field: 'Accountancy', colleges: COMMERCE_COLLEGES },
    ],
    weight: 6,
  },
  {
    profession: 'Investment Banker',
    category: 'finance',
    designations: ['Associate', 'Vice President', 'Director'],
    companies: ['Indus Ridge Capital', 'Northstar Securities', 'Meridian Bank'],
    incomeLakh: [28, 95],
    degrees: [{ degree: 'MBA, Finance', level: 'masters', field: 'Finance', colleges: MBA_COLLEGES }],
    weight: 4,
  },
  {
    profession: 'Lawyer',
    category: 'law',
    designations: ['Associate', 'Senior Associate', 'Legal Counsel'],
    companies: ['LexBridge Partners', 'Rao & Khanna Associates', 'Veritas Legal'],
    incomeLakh: [8, 48],
    degrees: [{ degree: 'BA LLB', level: 'professional', field: 'Law', colleges: LAW_COLLEGES }],
    weight: 5,
  },
  {
    profession: 'Management Consultant',
    category: 'consulting',
    designations: ['Consultant', 'Engagement Manager', 'Senior Consultant'],
    companies: ['Avant Strategy Group', 'Clearpath Consulting'],
    incomeLakh: [22, 65],
    degrees: [{ degree: 'MBA', level: 'masters', field: 'Strategy', colleges: MBA_COLLEGES }],
    weight: 4,
  },
  {
    profession: 'Marketing Manager',
    category: 'business',
    designations: ['Brand Manager', 'Marketing Manager', 'Head of Growth'],
    companies: ['Saffron Consumer Brands', 'Brightleaf Retail', 'Kiran Foods'],
    incomeLakh: [12, 38],
    degrees: [
      { degree: 'MBA, Marketing', level: 'masters', field: 'Marketing', colleges: MBA_COLLEGES },
      { degree: 'BBA', level: 'bachelors', field: 'Business', colleges: COMMERCE_COLLEGES },
    ],
    weight: 5,
  },
  {
    profession: 'Entrepreneur',
    category: 'business',
    designations: ['Founder & CEO', 'Co-founder'],
    companies: ['Loomcraft Studio', 'Greenroot Farms', 'Ledgerly', 'Tiffin Trails'],
    incomeLakh: [10, 80],
    degrees: [
      { degree: 'B.Tech', level: 'bachelors', field: 'Engineering', colleges: TECH_COLLEGES },
      { degree: 'MBA', level: 'masters', field: 'Entrepreneurship', colleges: MBA_COLLEGES },
    ],
    weight: 3,
  },
  {
    profession: 'UX Designer',
    category: 'design',
    designations: ['Product Designer', 'Senior UX Designer', 'Design Lead'],
    companies: ['Studio Kiln', 'Pixelwala Design', 'Zentrix Software'],
    incomeLakh: [10, 36],
    degrees: [
      { degree: 'B.Des', level: 'bachelors', field: 'Interaction Design', colleges: DESIGN_COLLEGES },
      { degree: 'M.Des', level: 'masters', field: 'Interaction Design', colleges: DESIGN_COLLEGES },
    ],
    weight: 4,
  },
  {
    profession: 'Architect',
    category: 'architecture',
    designations: ['Architect', 'Senior Architect', 'Principal Architect'],
    companies: ['Form & Field Architects', 'Studio Mitti'],
    incomeLakh: [8, 30],
    degrees: [
      {
        degree: 'B.Arch',
        level: 'bachelors',
        field: 'Architecture',
        colleges: ['SPA Delhi', 'CEPT Ahmedabad', 'Sir JJ College of Architecture'],
      },
    ],
    weight: 3,
  },
  {
    profession: 'Professor',
    category: 'education',
    designations: ['Assistant Professor', 'Associate Professor'],
    companies: ['Deccan Institute of Technology', 'Northern Arts University'],
    incomeLakh: [9, 24],
    degrees: [{ degree: 'PhD', level: 'doctorate', field: 'Economics', colleges: ARTS_COLLEGES }],
    weight: 3,
  },
  {
    profession: 'Civil Servant',
    category: 'government',
    designations: ['IAS Officer', 'IRS Officer', 'IFS Officer'],
    companies: ['Government of India'],
    incomeLakh: [12, 22],
    degrees: [
      { degree: 'MA, Public Policy', level: 'masters', field: 'Public Policy', colleges: ARTS_COLLEGES },
    ],
    weight: 3,
  },
  {
    profession: 'Journalist',
    category: 'media',
    designations: ['Correspondent', 'Features Editor', 'Senior Reporter'],
    companies: ['The Daily Ledger', 'Metro Wire'],
    incomeLakh: [6, 20],
    degrees: [
      {
        degree: 'MA, Journalism',
        level: 'masters',
        field: 'Journalism',
        colleges: ['IIMC Delhi', 'Symbiosis Pune', 'Delhi University'],
      },
    ],
    weight: 2,
  },
  {
    profession: 'Research Scientist',
    category: 'science',
    designations: ['Research Scientist', 'Postdoctoral Fellow'],
    companies: ['Institute of Molecular Sciences', 'Lumen Data Labs'],
    incomeLakh: [10, 30],
    degrees: [
      {
        degree: 'PhD, Biotechnology',
        level: 'doctorate',
        field: 'Biotechnology',
        colleges: ['IISc Bengaluru', 'TIFR Mumbai', 'IISER Pune'],
      },
    ],
    weight: 2,
  },
  {
    profession: 'Commercial Pilot',
    category: 'aviation',
    designations: ['First Officer', 'Captain'],
    companies: ['SkyArc Airlines'],
    incomeLakh: [25, 60],
    degrees: [
      {
        degree: 'B.Sc, Aviation',
        level: 'bachelors',
        field: 'Aviation',
        colleges: ['Indira Gandhi Rashtriya Uran Akademi'],
      },
    ],
    weight: 2,
  },
];

export const ABROAD: { city: string; country: string; currency: Currency; perLakhInr: number }[] = [
  { city: 'Singapore', country: 'Singapore', currency: 'SGD', perLakhInr: 100_000 / 63 },
  { city: 'Dubai', country: 'United Arab Emirates', currency: 'AED', perLakhInr: 100_000 / 23 },
  { city: 'London', country: 'United Kingdom', currency: 'GBP', perLakhInr: 100_000 / 107 },
  { city: 'San Francisco', country: 'United States', currency: 'USD', perLakhInr: 100_000 / 84 },
];

export const INTERESTS = [
  'Travel',
  'Music',
  'Reading',
  'Cooking',
  'Fitness',
  'Yoga',
  'Trekking',
  'Photography',
  'Cricket',
  'Badminton',
  'Movies',
  'Theatre',
  'Dancing',
  'Painting',
  'Gardening',
  'Running',
  'Cycling',
  'Board games',
  'Volunteering',
  'Classical music',
  'Podcasts',
  'Swimming',
  'Writing',
  'Food exploration',
  'Tennis',
];

export const VALUES = [
  'Honesty',
  'Family',
  'Ambition',
  'Kindness',
  'Humour',
  'Independence',
  'Faith',
  'Loyalty',
  'Respect',
  'Curiosity',
  'Generosity',
  'Stability',
];

export const PARENT_OCCUPATIONS = [
  'a retired bank manager',
  'a school principal',
  'a businessman',
  'a retired army officer',
  'a civil engineer',
  'a doctor',
  'a chartered accountant',
  'a government officer',
  'a professor',
  'a homemaker',
  'a lawyer',
  'a textile trader',
];

export const DIET_DEFAULT: [Diet, number][] = [
  ['non_vegetarian', 50],
  ['vegetarian', 30],
  ['eggetarian', 15],
  ['vegan', 5],
];

export const CAREER_GOALS: Record<ProfessionCategory, string[]> = {
  technology: [
    'Wants to move into engineering leadership in the next few years.',
    'Planning to build a product company eventually.',
  ],
  medicine: [
    'Building a paediatric practice and hopes to start a clinic.',
    'Aims to complete a fellowship and stay in clinical practice.',
  ],
  finance: ['Working toward a CFO-track role.', 'Plans to move into private equity.'],
  law: ['Aiming for partnership at the firm.', 'Interested in policy and public-interest litigation.'],
  business: ['Scaling the business to new cities.', 'Wants to lead a consumer brand end to end.'],
  consulting: ['Plans to move into an operating role at a growth company.', 'Aiming for a partner track.'],
  design: ['Wants to lead a design team and mentor juniors.', 'Plans to start an independent studio.'],
  architecture: ['Hopes to start a sustainable-architecture practice.', 'Focused on large public projects.'],
  education: ['Continuing research and hoping to publish a book.', 'Wants to build an education non-profit.'],
  government: ['Committed to a long-term public-service career.', 'Interested in urban governance roles.'],
  media: ['Wants to write long-form and documentary work.', 'Aiming to lead a newsroom team.'],
  science: ['Plans to continue research and set up a lab.', 'Exploring a move into biotech industry R&D.'],
  aviation: ['Working toward command of wide-body aircraft.', 'Interested in training new pilots later on.'],
};
