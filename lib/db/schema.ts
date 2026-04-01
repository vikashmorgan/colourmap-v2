import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const checkIns = pgTable('check_ins', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  sliderValue: integer('slider_value').notNull(),
  note: text('note'),
  tags: text('tags').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const lifeScans = pgTable('life_scans', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  body: integer('body'),
  mind: integer('mind'),
  relationships: integer('relationships'),
  purpose: integer('purpose'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
