import {
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export type CheckInFacingEntry = {
  label: string;
  answers: string[];
};

export type CheckInFacing = Record<string, CheckInFacingEntry>;

export type CheckInPulses = Partial<Record<'body' | 'attitude' | 'structure', number>>;

export type CheckInFeelingCompass = Partial<
  Record<'attitude' | 'emotions' | 'presence' | 'body', number>
>;

export const checkIns = pgTable('check_ins', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  sliderValue: integer('slider_value').notNull(),
  note: text('note'),
  tags: text('tags').array(),
  missionId: uuid('mission_id'),
  emotionName: text('emotion_name'),
  emotionColor: text('emotion_color'),
  facing: jsonb('facing').$type<CheckInFacing | null>(),
  pulses: jsonb('pulses').$type<CheckInPulses | null>(),
  challenge: text('challenge'),
  flow: text('flow'),
  feelingCompass: jsonb('feeling_compass').$type<CheckInFeelingCompass | null>(),
  feelingStage: integer('feeling_stage'),
  feelingSupport: jsonb('feeling_support').$type<string[] | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/*
 * A mission is a thing you intend to do, written from wherever you are.
 *
 * The four columns added below are what let the tree show STATE rather than
 * only structure. Today the figure counts routes, which is true and static;
 * with these it can say what is moving, what has stalled and what is close.
 *
 * `branch` is the one that needs defending. `lib/branches.ts` holds the rule
 * that A BRANCH IS COMPUTED, NEVER STORED — nothing is filed anywhere, and
 * which branch a thing appears under is a pure function over what it is.
 *
 * A mission is the exception, and it is not a contradiction. A route has a
 * path the function can read; a sentence you typed on a phone has nothing to
 * compute from. Guessing "Corriger Sanitas" into Admin from its text would be
 * a classifier pretending to be a rule. So the person says, once, and the
 * column holds the answer — which is storage of a STATEMENT, not filing of an
 * item. Leave it null and the mission simply belongs to no branch, which is
 * also true of plenty of things.
 */
export const missions = pgTable('missions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  blocking: text('blocking'),
  nextStep: text('next_step'),
  completed: boolean('completed').default(false).notNull(),
  /** 'art' | 'admin' | 'energy', or null for a mission that belongs to none. */
  branch: text('branch'),
  /** A date, not a timestamp: "the 30th" is the fact, not 09:00 on the 30th. */
  dueOn: date('due_on'),
  /**
   * When something real last happened to this mission.
   *
   * The whole honesty of "actively growing" rests on this column. It is set by
   * a recorded event — an edit, a status write-back from the terminal — and
   * never by opening the app or looking at the mission. Movement has to be a
   * fact or the tree is decoration.
   */
  movedAt: timestamp('moved_at', { withTimezone: true }),
  /** Free text from whatever did the work, so the app can show why it moved. */
  movedNote: text('moved_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * What the scheduled reader wrote back.
 *
 * Deliberately NOT the notebook. `docs/specs/integrated-system.md` is explicit
 * that the notebook's entire value is that nobody has edited it, so anything
 * generated lands in its own table and the app shows it as generated.
 *
 * One row per run. Short, replaceable, and safe to delete — none of this is a
 * record of what the person thought.
 */
export const digests = pgTable('digests', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  /** 'weekly' today. Room for others without a migration. */
  kind: text('kind').notNull().default('weekly'),
  /** The rendered text, exactly as the terminal would have printed it. */
  body: text('body').notNull(),
  /** Where it ran, so a surprising digest can be traced. */
  source: text('source').notNull().default('github-actions'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const backlog = pgTable('backlog', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull(),
  notes: text('notes'),
  done: boolean('done').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const lifeScans = pgTable('life_scans', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  door: text('door').notNull(),
  sliders: jsonb('sliders').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const scanReflections = pgTable('scan_reflections', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  scanGroup: uuid('scan_group').notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const cockpitSections = pgTable('cockpit_sections', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  position: integer('position').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sectionTrackers = pgTable('section_trackers', {
  id: uuid('id').defaultRandom().primaryKey(),
  sectionId: uuid('section_id').notNull(),
  label: text('label').notNull(),
  type: text('type').notNull(),
  position: integer('position').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const lifeScanAnswers = pgTable('life_scan_answers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notebookEntries = pgTable('notebook_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  category: text('category').notNull(),
  title: text('title').notNull(),
  content: text('content'),
  tags: text('tags').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Daily objectives (today + push for tomorrow) ───
export const dailyObjectives = pgTable('daily_objectives', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  text: text('text').notNull(),
  done: boolean('done').notNull().default(false),
  list: text('list').notNull().default('today'), // 'today' | 'tomorrow'
  notes: text('notes'),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Agenda blocks ───
export const agendaBlocks = pgTable('agenda_blocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  text: text('text').notNull(),
  date: date('date').notNull(),
  startHour: integer('start_hour').notNull(),
  duration: integer('duration_minutes').notNull().default(60), // in minutes
  color: text('color').notNull().default('#C4A060'),
  kind: text('kind').notNull().default('mission'), // 'mission' | 'emotion'
  tagName: text('tag_name'),
  tagColor: text('tag_color'),
  tagCategoryId: text('tag_category_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Life categories ───
export const lifeCategories = pgTable('life_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#C4A060'),
  compass: text('compass'), // 'caring' | 'doing' | 'sharing' | null
  state: text('state'), // 'flowing' | 'stuck' | null
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Outings / social life ───
export const outings = pgTable('outings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  text: text('text').notNull(),
  date: date('date').notNull(),
  color: text('color').notNull().default('#6B7F4E'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const dailyTrackerEntries = pgTable('daily_tracker_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  trackerId: uuid('tracker_id').notNull(),
  userId: uuid('user_id').notNull(),
  date: date('date').notNull(),
  value: integer('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Circles — shared spaces ───
export const circles = pgTable('circles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  color: text('color').notNull().default('#D4805A'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const circleMembers = pgTable('circle_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  circleId: uuid('circle_id').notNull(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#D4805A'),
  pulse: text('pulse'),
  pulseColor: text('pulse_color'),
  sharePulse: boolean('share_pulse').default(false).notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
});

export const circleMissions = pgTable('circle_missions', {
  id: uuid('id').defaultRandom().primaryKey(),
  circleId: uuid('circle_id').notNull(),
  text: text('text').notNull(),
  claimedBy: uuid('claimed_by'),
  done: boolean('done').default(false).notNull(),
  dueDate: date('due_date'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const circleNotes = pgTable('circle_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  circleId: uuid('circle_id').notNull(),
  authorId: uuid('author_id').notNull(),
  authorName: text('author_name').notNull(),
  text: text('text').notNull(),
  sessionId: uuid('session_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const circleSessions = pgTable('circle_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  circleId: uuid('circle_id').notNull(),
  startedBy: uuid('started_by').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  summary: text('summary'),
});

export const circleDecisions = pgTable('circle_decisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  circleId: uuid('circle_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('proposed'),
  decision: text('decision'),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const circleDecisionVotes = pgTable('circle_decision_votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  decisionId: uuid('decision_id').notNull(),
  memberId: uuid('member_id').notNull(),
  memberName: text('member_name').notNull(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Designer observations — feedback log captured via the
// triple-tap dev overlay. Each entry is one block of feedback
// + the part of the app it's about (Day, Music, Circles, etc.).
export const designerObservations = pgTable('designer_observations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  area: text('area'),
  text: text('text').notNull(),
  done: boolean('done').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Sparks ───────────────────────────────────────────────────────────────────

export type SparkCategory = 'fun' | 'creative' | 'professional' | 'growth';
export type SparkTimeWindow = 'this_week' | 'this_month' | 'no_rush';
export type SparkStatus = 'active' | 'fulfilled' | 'expired';
export type ResonanceType = 'resonate' | 'join_request';
export type ResonanceStatus = 'pending' | 'accepted' | 'ignored';

export const sparks = pgTable('sparks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  circleId: uuid('circle_id'),
  text: varchar('text', { length: 200 }).notNull(),
  category: text('category').notNull().default('fun'),
  timeWindow: text('time_window').notNull().default('this_week'),
  isOpen: boolean('is_open').notNull().default(false),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  zoneLabel: text('zone_label'),
  status: text('status').notNull().default('active'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sparkResonances = pgTable('spark_resonances', {
  id: uuid('id').defaultRandom().primaryKey(),
  sparkId: uuid('spark_id').notNull(),
  userId: uuid('user_id').notNull(),
  type: text('type').notNull().default('resonate'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Music recordings ────────────────────────────────────────────────────────

export const recordings = pgTable('recordings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull(),
  storagePath: text('storage_path').notNull(),
  publicUrl: text('public_url').notNull(),
  durationSecs: integer('duration_secs'),
  songId: uuid('song_id'),
  category: text('category').notNull().default('solo'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Chat ────────────────────────────────────────────────────────────────────

export type ChatEntityType = 'circle' | 'spark';

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'), // null → 1:1 DM
  entityType: text('entity_type').$type<ChatEntityType>(), // 'circle' | 'spark' | null
  entityId: uuid('entity_id'), // FK to circle/spark when entityType is set
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const conversationMembers = pgTable('conversation_members', {
  conversationId: uuid('conversation_id').notNull(),
  userId: uuid('user_id').notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
});

export const channels = pgTable('channels', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull(),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  channelId: uuid('channel_id').notNull(),
  userId: uuid('user_id').notNull(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Day-sync tables ───────────────────────────────────────────────────────────
// Append-only event log for all time-series tracking (axis readings, notes,
// ritual completions, behavior logs). New event kinds = new `type` string;
// no schema change required.
export const dayEvents = pgTable('day_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  date: date('date').notNull(),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Key-value store for config blobs and preferences that aren't time-series:
// ritual/behavior definitions, card lists, UI settings, etc.
export const userPrefs = pgTable('user_prefs', {
  userId: uuid('user_id').notNull(),
  key: text('key').notNull(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
