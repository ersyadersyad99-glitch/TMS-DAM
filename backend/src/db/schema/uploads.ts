import { pgTable, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const uploadedFiles = pgTable('uploaded_files', {
  id:        varchar('id', { length: 255 }).primaryKey(),
  filename:  varchar('filename', { length: 255 }).notNull().unique(),
  mimeType:  varchar('mime_type', { length: 100 }).notNull(),
  data:      text('data').notNull(), // Base64 data string
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
