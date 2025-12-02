-- Create your database schema here

create table collections (
    id text primary key default gen_random_uuid(),
    title text not null,
    created_at timestamptz default now()
);

create table videos (
    id text primary key default gen_random_uuid(),
    title text not null,
    collection_id text references collections(id) on delete restrict on update cascade,
    created_at timestamptz default now()
);

DO $$
DECLARE
    _collection_id text;
BEGIN
    insert into collections (title) values ('Game of thrones') returning id into _collection_id;
    insert into videos (title, collection_id) values
    ('Winter is coming', _collection_id),
    ('The Kingsroad', _collection_id),
    ('Lord Snow', _collection_id);
END $$;

DO $$
DECLARE
    _collection_id text;
BEGIN
    insert into collections (title) values ('Breaking Bad') returning id into _collection_id;
    insert into videos (title, collection_id) values
    ('Episode 0', _collection_id),
    ('Episode 1', _collection_id),
    ('Episode 2', _collection_id);
END $$;
