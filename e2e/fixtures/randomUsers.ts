/**
 * A fixed randomuser.me batch, so every run sees the same people. It deliberately
 * includes the awkward cases: accents, a Persian (RTL) name, numeric-looking phones,
 * and an email with consecutive dots that strict validators reject.
 */
interface Person {
  uuid: string;
  gender: 'male' | 'female';
  title: string;
  first: string;
  last: string;
  country: string;
  city: string;
  state: string;
  street: [number, string];
  email: string;
  phone: string;
  dob: string;
}

/** Ids of fixture people that tests refer to directly. */
export const PERSON_ID = {
  noaLevi: 'e2e00000-0000-4000-8000-000000000002',
  johnSmith: 'e2e00000-0000-4000-8000-000000000006',
} as const;

const PEOPLE: Person[] = [
  {
    uuid: 'e2e00000-0000-4000-8000-000000000001',
    gender: 'male',
    title: 'Mr',
    first: 'José',
    last: 'García',
    country: 'Spain',
    city: 'Córdoba',
    state: 'Islas Baleares',
    street: [2067, 'Calle de La Democracia'],
    email: 'jose.garcia@example.com',
    phone: '928-519-794',
    dob: '1967-04-12T08:00:00.000Z',
  },
  {
    uuid: 'e2e00000-0000-4000-8000-000000000002',
    gender: 'female',
    title: 'Ms',
    first: 'Noa',
    last: 'Levi',
    country: 'United States',
    city: 'Billings',
    state: 'Michigan',
    street: [8929, 'Valwood Pkwy'],
    email: 'noa.levi@example.com',
    phone: '(272) 790-0888',
    dob: '1993-07-20T09:44:18.674Z',
  },
  {
    uuid: 'e2e00000-0000-4000-8000-000000000003',
    gender: 'male',
    title: 'Mr',
    first: 'نیما',
    last: 'رضایی',
    country: 'Iran',
    city: 'تهران',
    state: 'تهران',
    street: [5164, 'شهید کشوری'],
    email: 'nima.rdyy@example.com',
    phone: '055-12345678',
    dob: '1985-01-30T00:00:00.000Z',
  },
  {
    uuid: 'e2e00000-0000-4000-8000-000000000004',
    gender: 'male',
    title: 'Mr',
    first: 'Hans-J.',
    last: 'Diederich',
    country: 'Germany',
    city: 'Bamberg',
    state: 'Bayern',
    street: [42, 'Lindenstraße'],
    email: 'hans-j..diederich@example.com',
    phone: '0170-1234567',
    dob: '1959-11-02T00:00:00.000Z',
  },
  {
    uuid: 'e2e00000-0000-4000-8000-000000000005',
    gender: 'female',
    title: 'Mrs',
    first: 'Begüm',
    last: 'Kaya',
    country: 'Turkey',
    city: 'Ankara',
    state: 'Ankara',
    street: [11, 'Atatürk Blv'],
    email: 'begum.kaya@example.com',
    phone: '(605)-579-6389',
    dob: '1979-05-05T00:00:00.000Z',
  },
  {
    uuid: 'e2e00000-0000-4000-8000-000000000006',
    gender: 'male',
    title: 'Mr',
    first: 'John',
    last: 'Smith',
    country: 'United States',
    city: 'Austin',
    state: 'Texas',
    street: [12, 'Main St'],
    email: 'john.smith@example.com',
    phone: '(512) 555-0101',
    dob: '1990-03-15T10:00:00.000Z',
  },
  {
    uuid: 'e2e00000-0000-4000-8000-000000000007',
    gender: 'female',
    title: 'Miss',
    first: 'Iida',
    last: 'Halonen',
    country: 'Finland',
    city: 'Espoo',
    state: 'Uusimaa',
    street: [3, 'Hämeenkatu'],
    email: 'iida.halonen@example.com',
    phone: '03-580-983',
    dob: '1996-09-09T00:00:00.000Z',
  },
  {
    uuid: 'e2e00000-0000-4000-8000-000000000008',
    gender: 'female',
    title: 'Mademoiselle',
    first: 'Dorothea',
    last: 'Dumont',
    country: 'Switzerland',
    city: 'Genève',
    state: 'Genève',
    street: [7, 'Rue du Rhône'],
    email: 'dorothea.dumont@example.com',
    phone: '077 917 74 28',
    dob: '1988-12-24T00:00:00.000Z',
  },
  {
    uuid: 'e2e00000-0000-4000-8000-000000000009',
    gender: 'male',
    title: 'Mr',
    first: 'Luke',
    last: 'Kelly',
    country: 'United Kingdom',
    city: 'Leeds',
    state: 'West Yorkshire',
    street: [221, 'Baker St'],
    email: 'luke.kelly@example.com',
    phone: '017687 59783',
    dob: '1975-06-01T00:00:00.000Z',
  },
  {
    uuid: 'e2e00000-0000-4000-8000-000000000010',
    gender: 'female',
    title: 'Ms',
    first: 'Katrine',
    last: 'Narum',
    country: 'Norway',
    city: 'Jevnaker',
    state: 'Finnmark',
    street: [6275, 'Frederik Haslunds gate'],
    email: 'katrine.narum@example.com',
    phone: '74145039',
    dob: '1971-02-11T00:00:00.000Z',
  },
];

const portrait = (gender: Person['gender'], index: number, size: 'thumb/' | '') =>
  `https://randomuser.me/api/portraits/${size}${gender === 'male' ? 'men' : 'women'}/${index}.jpg`;

export const randomUserResponse = {
  results: PEOPLE.map((person, index) => ({
    gender: person.gender,
    name: { title: person.title, first: person.first, last: person.last },
    location: {
      street: { number: person.street[0], name: person.street[1] },
      city: person.city,
      state: person.state,
      country: person.country,
    },
    email: person.email,
    login: { uuid: person.uuid },
    dob: { date: person.dob },
    phone: person.phone,
    picture: { large: portrait(person.gender, index, ''), thumbnail: portrait(person.gender, index, 'thumb/') },
  })),
};
