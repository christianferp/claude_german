/**
 * The pool of subjects a written episode can be about. Episodes are no
 * longer tied to the calendar, so a new one takes a topic the learner's
 * shelf does not cover yet (see `nextTopic` in services/podcast.ts).
 */

export interface Topic {
  /** English label, shown on the shelf card and fed to the generator. */
  en: string;
  /** A nudge for the generator about what to cover. */
  angle: string;
}

export const TOPICS: Topic[] = [
  { en: 'School', angle: 'how school works, school types, grades and reports' },
  { en: 'Food and meals', angle: 'typical meals, mealtimes, what people eat at home' },
  { en: 'Public transport', angle: 'buses, trains, tickets and getting around a city' },
  { en: 'The weather', angle: 'seasons, typical weather and how it changes plans' },
  { en: 'Work and jobs', angle: 'common jobs, the working day, holidays and contracts' },
  { en: 'Shopping', angle: 'supermarkets, opening hours, paying and bargains' },
  { en: 'Family', angle: 'family members, living together, visits and celebrations' },
  { en: 'Hobbies', angle: 'clubs, free-time activities and how people spend weekends' },
  { en: 'Health and the doctor', angle: 'appointments, pharmacies, insurance and feeling unwell' },
  { en: 'Housing', angle: 'flats, renting, neighbours and moving house' },
  { en: 'Travel and holidays', angle: 'planning a trip, packing, popular destinations' },
  { en: 'Sport', angle: 'popular sports, clubs, watching versus playing' },
  { en: 'Music', angle: 'listening habits, concerts, instruments and tastes' },
  { en: 'Technology', angle: 'phones, apps, being online and screen time' },
  { en: 'The environment', angle: 'recycling, saving energy, cycling and small habits' },
  { en: 'Festivals and traditions', angle: 'annual celebrations, customs, food and gifts' },
  { en: 'Restaurants and cafés', angle: 'ordering, tipping, reserving a table' },
  { en: 'Money', angle: 'cash versus card, saving, prices and budgeting' },
  { en: 'Pets and animals', angle: 'common pets, looking after them, animals in the city' },
  { en: 'The city and the countryside', angle: 'differences in daily life between the two' },
  { en: 'Daily routine', angle: 'a normal day from morning to evening' },
  { en: 'Learning languages', angle: 'why people learn, what is hard, useful habits' },
  { en: 'Neighbours', angle: 'shared houses, rules, small talk and favours' },
  { en: 'The post office and deliveries', angle: 'sending parcels, waiting for packages' },
  { en: 'Cooking', angle: 'simple recipes, ingredients, cooking at home' },
  { en: 'University', angle: 'studying, exams, student life and costs' },
  { en: 'Job interviews', angle: 'applications, preparing, typical questions' },
  { en: 'Small talk', angle: 'polite phrases, greetings and safe topics' },
  { en: 'Childhood memories', angle: 'growing up, games, school days and family trips' },
  { en: 'News and media', angle: 'newspapers, television, where people get their news' },
  { en: 'Birthdays', angle: 'invitations, presents, parties and wishes' },
  { en: 'Winter', angle: 'cold weather, snow, clothes and winter activities' },
  { en: 'Summer', angle: 'heat, swimming, ice cream and long evenings' },
  { en: 'Books and reading', angle: 'libraries, favourite books and reading habits' },
  { en: 'Films and series', angle: 'cinema, streaming, dubbing and subtitles' },
  { en: 'Driving', angle: 'licences, traffic, parking and speed limits' },
  { en: 'Friends', angle: 'making friends, meeting up, staying in touch' },
  { en: 'The gym and fitness', angle: 'exercise habits, memberships and motivation' },
  { en: 'Coffee and tea', angle: 'drinking habits, cafés and the daily cup' },
  { en: 'Bureaucracy', angle: 'forms, appointments, registration and waiting' },
];

