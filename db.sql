CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS app_public.collection CASCADE;
CREATE TABLE app_public.collection (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    count_episode INT NULL,
    duration TEXT NULL
);

INSERT INTO app_public.collection (title, type, count_episode, duration) VALUES ('Game of thrones', 'season', 10, NULL);
INSERT INTO app_public.collection (title, type, count_episode, duration) VALUES ('Breaking bad', 'season', 8, NULL);
INSERT INTO app_public.collection (title, type, count_episode, duration) VALUES ('Harry potter', 'movie', NULL, '2h 30min');
INSERT INTO app_public.collection (title, type, count_episode, duration) VALUES ('Lord of the rings', 'movie', NULL, '3h 15min');

COMMENT ON TABLE app_public.collection IS $$
  @name ICollection
  @interface mode:single type:type
  @type season name:SeasonCollection attributes:count_episode
  @type movie name:MovieCollection attributes:duration
$$;

DROP TABLE IF EXISTS app_public.meta CASCADE;
CREATE TABLE app_public.meta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    meta_value TEXT NOT NULL
);

DROP TABLE IF EXISTS app_public.catalog CASCADE;
CREATE TABLE app_public.catalog (
  id TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL
);

DROP TABLE IF EXISTS app_public.catalog_content CASCADE;
CREATE TABLE app_public.catalog_content (
  catalog_parent_id TEXT NOT NULL,
  tab_index INT NOT NULL,
  content_parent_id TEXT NOT NULL,
  content_type TEXT NOT NULL,

  PRIMARY KEY(catalog_parent_id, content_parent_id, tab_index, content_type)
);