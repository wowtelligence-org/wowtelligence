-- Enable pgvector extension

-- -- Drop existing tables and extensions
-- DROP EXTENSION IF EXISTS vector CASCADE;
-- DROP TABLE IF EXISTS relationships CASCADE;
-- DROP TABLE IF EXISTS participants CASCADE;
-- DROP TABLE IF EXISTS logs CASCADE;
-- DROP TABLE IF EXISTS goals CASCADE;
-- DROP TABLE IF EXISTS memories CASCADE;
-- DROP TABLE IF EXISTS rooms CASCADE;
-- DROP TABLE IF EXISTS accounts CASCADE;


CREATE EXTENSION IF NOT EXISTS vector;

BEGIN;

CREATE TABLE accounts (
    "id" UUID PRIMARY KEY,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "username" TEXT,
    "email" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "details" JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE rooms (
    "id" UUID PRIMARY KEY,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE memories (
    "id" UUID PRIMARY KEY,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "content" JSONB NOT NULL,
    "embedding" vector(1536),
    "userId" UUID REFERENCES accounts("id"),
    "agentId" UUID REFERENCES accounts("id"),
    "roomId" UUID REFERENCES rooms("id"),
    "unique" BOOLEAN DEFAULT true NOT NULL,
    CONSTRAINT fk_room FOREIGN KEY ("roomId") REFERENCES rooms("id") ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY ("userId") REFERENCES accounts("id") ON DELETE CASCADE,
    CONSTRAINT fk_agent FOREIGN KEY ("agentId") REFERENCES accounts("id") ON DELETE CASCADE
);

CREATE TABLE goals (
    "id" UUID PRIMARY KEY,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID REFERENCES accounts("id"),
    "name" TEXT,
    "status" TEXT,
    "description" TEXT,
    "roomId" UUID REFERENCES rooms("id"),
    "objectives" JSONB DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT fk_room FOREIGN KEY ("roomId") REFERENCES rooms("id") ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY ("userId") REFERENCES accounts("id") ON DELETE CASCADE
);

CREATE TABLE logs (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL REFERENCES accounts("id"),
    "body" JSONB NOT NULL,
    "type" TEXT NOT NULL,
    "roomId" UUID NOT NULL REFERENCES rooms("id"),
    CONSTRAINT fk_room FOREIGN KEY ("roomId") REFERENCES rooms("id") ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY ("userId") REFERENCES accounts("id") ON DELETE CASCADE
);

CREATE TABLE participants (
    "id" UUID PRIMARY KEY,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID REFERENCES accounts("id"),
    "roomId" UUID REFERENCES rooms("id"),
    "userState" TEXT,
    "last_message_read" TEXT,
    UNIQUE("userId", "roomId"),
    CONSTRAINT fk_room FOREIGN KEY ("roomId") REFERENCES rooms("id") ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY ("userId") REFERENCES accounts("id") ON DELETE CASCADE
);

CREATE TABLE relationships (
    "id" UUID PRIMARY KEY,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "userA" UUID NOT NULL REFERENCES accounts("id"),
    "userB" UUID NOT NULL REFERENCES accounts("id"),
    "status" TEXT,
    "userId" UUID NOT NULL REFERENCES accounts("id"),
    CONSTRAINT fk_user_a FOREIGN KEY ("userA") REFERENCES accounts("id") ON DELETE CASCADE,
    CONSTRAINT fk_user_b FOREIGN KEY ("userB") REFERENCES accounts("id") ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY ("userId") REFERENCES accounts("id") ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_memories_embedding ON memories USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX idx_memories_type_room ON memories("type", "roomId");
CREATE INDEX idx_participants_user ON participants("userId");
CREATE INDEX idx_participants_room ON participants("roomId");
CREATE INDEX idx_relationships_users ON relationships("userA", "userB");

COMMIT;