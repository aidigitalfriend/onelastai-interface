-- PostgreSQL Initialization Script for AI Digital Friend Zone
-- This runs automatically when the container is first created

-- Enable essential extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- Trigram text search for code
CREATE EXTENSION IF NOT EXISTS "vector";        -- pgvector for AI embeddings

-- Create indexes for better performance (these complement Prisma indexes)
-- Note: Prisma will create most indexes, these are additional optimizations

-- Full-text search configuration for code
CREATE TEXT SEARCH CONFIGURATION code_search (COPY = english);

-- Function to update updatedAt timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE ai_friend_zone TO postgres;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL initialized with extensions: uuid-ossp, pg_trgm, vector';
END $$;
