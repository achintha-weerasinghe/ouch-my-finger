// @ts-check
import { makePgService } from "@dataplan/pg/adaptors/pg";
import AmberPreset from "postgraphile/presets/amber";
import { makeV4Preset } from "postgraphile/presets/v4";
import { PgAggregatesPreset } from "@graphile/pg-aggregates";
import { PgManyToManyPreset } from "@graphile-contrib/pg-many-to-many";
// import { PgSimplifyInflectionPreset } from "@graphile/simplify-inflection";
import PersistedPlugin from "@grafserv/persisted";
import { PgOmitArchivedPlugin } from "@graphile-contrib/pg-omit-archived";
import { PgSimplifyInflectionPreset } from "@graphile/simplify-inflection";
import { NodePlugin } from "postgraphile/graphile-build";
import { RootQueryExtensionsPlugin } from "./query-extensions";
import { PgAggregatesAddConnectionAggregatesPlugin } from '@graphile/pg-aggregates/dist/AddConnectionAggregatesPlugin';
import { PgAggregatesAddConnectionGroupedAggregatesPlugin } from '@graphile/pg-aggregates/dist/AddConnectionGroupedAggregatesPlugin';
import { PgConnectionArgOrderByDefaultValuePlugin } from 'postgraphile/graphile-build-pg';

// For configuration file details, see: https://postgraphile.org/postgraphile/next/config

/** @satisfies {GraphileConfig.Preset} */
const preset: GraphileConfig.Preset = {
  extends: [
    AmberPreset,
    makeV4Preset({
      /* Enter your V4 options here */
      graphiql: true,
      graphiqlRoute: "/",
      skipPlugins: [
        PgConnectionArgOrderByDefaultValuePlugin,
        PgAggregatesAddConnectionGroupedAggregatesPlugin,
        PgAggregatesAddConnectionAggregatesPlugin,
        NodePlugin
      ]
    }),
    // PostGraphileConnectionFilterPreset,
    PgManyToManyPreset,
    PgAggregatesPreset,
    PgSimplifyInflectionPreset
  ],
  plugins: [PersistedPlugin, PgOmitArchivedPlugin, RootQueryExtensionsPlugin],
  disablePlugins: ['QueryQueryPlugin'],
  pgServices: [
    makePgService({
      // Database connection string:
      connectionString: 'postgresql://postgres:postgres@localhost:5432/outch-my-finger',
      // List of schemas to expose:
      schemas: ["app_public"],
    }),
  ],
  schema: {
    defaultBehavior: '-delete -insert -update -query:*:*',
    exportSchemaSDLPath: 'schema.graphql'
  },
  grafserv: {
    port: 5678,
    websockets: true,
    allowUnpersistedOperation: true,
  },
  grafast: {
    explain: true,
  },
};

export default preset;
