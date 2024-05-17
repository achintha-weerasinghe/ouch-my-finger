DROP TABLE IF EXISTS app_public.collection CASCADE;
CREATE TABLE app_public.collection (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    count_episode INT NULL,
    duration TEXT NULL
);

INSERT INTO app_public.collection (id, title, type, count_episode, duration) VALUES ('co-1', 'Game of thrones', 'season', 10, NULL);
INSERT INTO app_public.collection (id, title, type, count_episode, duration) VALUES ('co-2', 'Breaking bad', 'season', 8, NULL);
INSERT INTO app_public.collection (id, title, type, count_episode, duration) VALUES ('co-3', 'Harry potter', 'movie', NULL, '2h 30min');
INSERT INTO app_public.collection (id, title, type, count_episode, duration) VALUES ('co-4', 'Lord of the rings', 'movie', NULL, '3h 15min');

COMMENT ON TABLE app_public.collection IS $$
  @name ICollection
  @interface mode:single type:type
  @type season name:SeasonCollection attributes:count_episode
  @type movie name:MovieCollection attributes:duration
$$;

DROP TABLE IF EXISTS app_public.meta CASCADE;
CREATE TABLE app_public.meta (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    meta_value TEXT NOT NULL
);

INSERT INTO app_public.meta (id, title, meta_value) VALUES ('meta-1', 'Action', 'genre-action');
INSERT INTO app_public.meta (id, title, meta_value) VALUES ('meta-2', 'Adventure', 'genre-adventure');

DROP TABLE IF EXISTS app_public.catalog CASCADE;
CREATE TABLE app_public.catalog (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL
);

INSERT INTO app_public.catalog (id, title) VALUES ('ca-1', 'Adult');
INSERT INTO app_public.catalog (id, title) VALUES ('ca-2', 'Children');

DROP TABLE IF EXISTS app_public.catalog_content CASCADE;
CREATE TABLE app_public.catalog_content (
  catalog_parent_id TEXT NOT NULL,
  tab_index INT NOT NULL,
  content_parent_id TEXT NOT NULL,
  content_type TEXT NOT NULL,

  PRIMARY KEY(catalog_parent_id, content_parent_id, tab_index, content_type)
);

INSERT INTO app_public.catalog_content (catalog_parent_id, tab_index, content_parent_id, content_type) VALUES ('ca-1', 0, 'co-1', 'collection');
INSERT INTO app_public.catalog_content (catalog_parent_id, tab_index, content_parent_id, content_type) VALUES ('ca-1', 0, 'co-3', 'collection');
INSERT INTO app_public.catalog_content (catalog_parent_id, tab_index, content_parent_id, content_type) VALUES ('ca-1', 0, 'meta-1', 'meta');
INSERT INTO app_public.catalog_content (catalog_parent_id, tab_index, content_parent_id, content_type) VALUES ('ca-1', 1, 'co-1', 'collection');
INSERT INTO app_public.catalog_content (catalog_parent_id, tab_index, content_parent_id, content_type) VALUES ('ca-1', 1, 'co-2', 'collection');
INSERT INTO app_public.catalog_content (catalog_parent_id, tab_index, content_parent_id, content_type) VALUES ('ca-1', 1, 'meta-2', 'meta');
-- non existing weak linked data
INSERT INTO app_public.catalog_content (catalog_parent_id, tab_index, content_parent_id, content_type) VALUES ('ca-1', 1, 'co-7', 'collection');
INSERT INTO app_public.catalog_content (catalog_parent_id, tab_index, content_parent_id, content_type) VALUES ('ca-1', 1, 'meta-10', 'meta');