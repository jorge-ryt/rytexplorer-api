-- CreateTable
CREATE TABLE "blocks" (
    "block_hash" VARCHAR(255) NOT NULL,
    "id" BIGSERIAL NOT NULL,
    "version" VARCHAR(255) NOT NULL,
    "merkle_root" VARCHAR(255) NOT NULL,
    "block_number" VARCHAR(255) NOT NULL,
    "block_status" VARCHAR(255) NOT NULL DEFAULT 'confirmed',
    "previous_hash" VARCHAR(255) NOT NULL,
    "state_root" VARCHAR(255) NOT NULL,
    "transaction_root" VARCHAR(255) NOT NULL,
    "reciept_root" VARCHAR(255) NOT NULL,
    "timestamp" VARCHAR(255),
    "logs_bloom" VARCHAR(255) NOT NULL,
    "block_reward" VARCHAR(255) NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "data" VARCHAR(255) NOT NULL,
    "to" VARCHAR(255) NOT NULL,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "hash" VARCHAR(255) NOT NULL,
    "id" BIGSERIAL NOT NULL,
    "transaction_Status" VARCHAR(255) NOT NULL,
    "from" VARCHAR(255) NOT NULL,
    "to" VARCHAR(255) NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "transaction_time" VARCHAR(255),
    "transaction_status" BOOLEAN,
    "functionType" VARCHAR(255) NOT NULL,
    "unix_timestamp" VARCHAR(255),
    "Status" BOOLEAN,
    "State" BOOLEAN,
    "nonce" VARCHAR(255) NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "node_id" VARCHAR(255) NOT NULL,
    "gas" VARCHAR(255) NOT NULL,
    "gas_price" VARCHAR(255) NOT NULL,
    "input" TEXT NOT NULL,
    "block_id" BIGINT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "block_number" VARCHAR(255) NOT NULL,
    "block_status" VARCHAR(255) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactionHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" VARCHAR(255) NOT NULL,
    "transactions" BIGINT NOT NULL,

    CONSTRAINT "transactionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replayBlocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "replayBlocks" BOOLEAN DEFAULT false,
    "lastBlock" VARCHAR(255),
    "latestBlock" VARCHAR(255),
    "Status" VARCHAR(255),

    CONSTRAINT "replayBlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "globalStats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ryt_price" BIGINT NOT NULL,
    "market_cap" BIGINT NOT NULL,
    "total_transactions" BIGINT NOT NULL,
    "tps" BIGINT NOT NULL,
    "latest_block" BIGINT NOT NULL,
    "active_stake" BIGINT NOT NULL,
    "validators" BIGINT NOT NULL,
    "rpc_nodes" BIGINT NOT NULL,

    CONSTRAINT "globalStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knex_migrations" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255),
    "batch" INTEGER,
    "migration_time" TIMESTAMPTZ(6),

    CONSTRAINT "knex_migrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knex_migrations_lock" (
    "index" SERIAL NOT NULL,
    "is_locked" INTEGER,

    CONSTRAINT "knex_migrations_lock_pkey" PRIMARY KEY ("index")
);

-- CreateTable
CREATE TABLE "nodesMap" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" VARCHAR(255) NOT NULL,
    "location" JSONB NOT NULL,
    "label" VARCHAR(255),
    "node_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "nodesMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokenInfo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "price" BIGINT NOT NULL,
    "gas_price" BIGINT NOT NULL,

    CONSTRAINT "tokenInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blocks_block_hash_key" ON "blocks"("block_hash");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_block_number_key" ON "blocks"("block_number");

-- CreateIndex
CREATE INDEX "idx_blocks_block_number" ON "blocks"("block_number");

-- CreateIndex
CREATE INDEX "idx_blocks_block_hash" ON "blocks"("block_hash");

-- CreateIndex
CREATE INDEX "idx_blocks_id_desc" ON "blocks"("id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_hash_key" ON "transactions"("hash");

-- CreateIndex
CREATE INDEX "idx_transactions_from" ON "transactions"("from");

-- CreateIndex
CREATE INDEX "idx_transactions_from_id_desc" ON "transactions"("from", "id" DESC);

-- CreateIndex
CREATE INDEX "idx_transactions_to" ON "transactions"("to");

-- CreateIndex
CREATE INDEX "idx_transactions_to_id_desc" ON "transactions"("to", "id" DESC);

-- CreateIndex
CREATE INDEX "idx_transactions_id_desc" ON "transactions"("id" DESC);

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
