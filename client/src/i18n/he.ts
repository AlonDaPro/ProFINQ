import { Gender } from '@/domain/profile';

/** Hebrew copy for the profile detail screen (Screen 3), which is rendered RTL. */
export const he = {
  documentTitle: 'כרטיס פרופיל',
  status: { saved: 'שמור במאגר', notSaved: 'טרם נשמר', savedOn: 'נשמר ב־' },
  sections: { personal: 'פרטים אישיים', address: 'כתובת', contact: 'פרטי קשר' },
  labels: {
    gender: 'מגדר',
    name: 'שם',
    title: 'תואר',
    firstName: 'שם פרטי',
    lastName: 'שם משפחה',
    age: 'גיל',
    birthYear: 'שנת לידה',
    street: 'רחוב',
    city: 'עיר',
    state: 'מחוז',
    country: 'ארץ',
    email: 'דוא״ל',
    phone: 'טלפון',
  },
  genders: { [Gender.Male]: 'זכר', [Gender.Female]: 'נקבה' } as Readonly<Record<string, string>>,
  actions: { save: 'שמירה', update: 'עדכון', delete: 'מחיקה', back: 'חזרה', cancel: 'ביטול' },
  pending: { save: 'שומר…', update: 'מעדכן…', delete: 'מוחק…' },
  feedback: {
    saved: 'הפרופיל נשמר במאגר',
    alreadySaved: 'הפרופיל כבר היה שמור במאגר. מוצג השם השמור.',
    updatedSaved: 'השם עודכן במאגר',
    updatedLocal: 'השם עודכן ברשימה. הפרופיל עדיין לא נשמר במאגר.',
    failed: 'הפעולה נכשלה:',
    noLongerInBatch: 'הפרופיל כבר אינו ברשימה הנוכחית',
    deletedElsewhere: 'הפרופיל נמחק מהמאגר ולכן לא ניתן לעדכן אותו',
  },
  validation: {
    required: 'שדה חובה',
    tooLong: (max: number) => `עד ${max} תווים`,
  },
  confirm: {
    deleteTitle: 'למחוק את הפרופיל?',
    deleteBody: 'הפרופיל יימחק מהמאגר. אפשר לשמור אותו שוב רק אם יופיע ברשימה אקראית.',
    discardTitle: 'לצאת בלי לשמור?',
    discardBody: 'השינויים בשם לא נשמרו ויאבדו.',
    discard: 'יציאה בלי שמירה',
  },
  loading: 'טוען פרופיל…',
  retry: 'נסה שוב',
  notFound: {
    title: 'הפרופיל לא נמצא',
    random: 'הפרופיל היה חלק מרשימה אקראית שכבר אינה בזיכרון (למשל לאחר רענון הדף). יש לחזור ולטעון רשימה חדשה.',
    saved: 'הפרופיל אינו קיים במאגר. ייתכן שנמחק.',
  },
} as const;

export function genderLabel(gender: string): string {
  return he.genders[gender.toLowerCase()] ?? gender;
}
