import { PgPolymorphicTypeMap, pgPolymorphic, withPgClient } from 'postgraphile/@dataplan/pg';
import { gql, makeExtendSchemaPlugin } from 'postgraphile/utils';

export const RootQueryExtensionsPlugin: GraphileConfig.Plugin = makeExtendSchemaPlugin((build) => {
    const {
        sql,
        input: { pgRegistry },
        grafast: { object, constant, each, connection, access, list },
    } = build;
    const { ICollection, meta, catalog, catalog_content } =
        pgRegistry.pgResources;
    return {
        typeDefs: gql`
        extend type Query {
          collections: ICollectionsConnection
          collectionById(id: String!): ICollection
          catalogs: CatalogsConnection
          catalogById(id: String!): Catalog
          metas: MetasConnection
        }

        union Content = MovieCollection | SeasonCollection | Meta
        extend type Catalog {
            contents: [Content] # TODO: Need a connection here
        }
      `,
        plans: {
            Query: {
                collections($parent, fieldArgs) {
                    const $collections = ICollection.find();

                    return connection($collections);
                },
                collectionById($parent, fieldArgs) {
                    const $collection = ICollection.get({ id: fieldArgs.get('id') });

                    return $collection;
                },
                catalogs($parent, fieldArgs) {
                    const $catalogs = catalog.find();

                    return connection($catalogs);
                },
                catalogById($parent, fieldArgs) {
                    const $catalog = catalog.get({ id: fieldArgs.get('id') });

                    return $catalog;
                },
                metas($parent, fieldArgs) {
                    const metas = meta.find();

                    return connection(metas);
                },
            },
            Catalog: {
                contents($parent, fieldArgs) {
                    // TODO: Had some errors inside each()

                    // const $contents = catalog_content.find({
                    //     catalog_parent_id: $parent.get('id'),
                    // });

                    // $contents.join({
                    //     type: 'left',
                    //     from: sql`app_public.collection`,
                    //     alias: sql`c`,
                    //     conditions: [sql`${$contents.alias}.content_type = 'collection' AND ${$contents.alias}.content_parent_id = c.id`],
                    // });

                    // $contents.join({
                    //     type: 'left',
                    //     from: sql`app_public.meta`,
                    //     alias: sql`m`,
                    //     conditions: [sql`${$contents.alias}.content_parent_id = m.id`],
                    // });

                    // $contents.where(sql`c.id IS NOT NULL OR m.id IS NOT NULL`);

                    // TODO: Need a way to write this using plans
                    const $contents = withPgClient(
                        catalog_content.executor,
                        list([$parent.get('id')]),
                        async (pgClient, [catalogId]: string[]) => {
                            const result = await pgClient.query<{ catalog_id: string; c_id: string; c_type: string; m_id: string }>({
                                text: /* SQL */ `
                                    SELECT cc.catalog_parent_id as catalog_id, c.id as c_id, c.type as c_type, m.id as m_id
                                    FROM app_public.catalog_content AS cc
                                    LEFT JOIN app_public.collection AS c
                                        ON cc.content_type = 'collection' AND cc.content_parent_id = c.id
                                    LEFT JOIN app_public.meta m
                                        ON cc.content_type = 'meta' AND cc.content_parent_id  = m.id
                                    WHERE cc.catalog_parent_id = $1 AND (c.id IS NOT NULL OR m.id IS NOT NULL)
                                `,
                                values: [catalogId],
                            });

                            return result.rows;
                        },
                    );

                    const entityTypeMap: PgPolymorphicTypeMap<any, { id: string; type: string | null }[], any> = {
                        MovieCollection: {
                            match: (specifier) => specifier[0].type === 'movie',
                            plan: ($specifier) => ICollection.get({ id: access($specifier.at(0), ['id']) }),
                        },
                        SeasonCollection: {
                            match: (specifier) => specifier[0].type === 'season',
                            plan: ($specifier) => ICollection.get({ id: access($specifier.at(0), ['id']) }),
                        },
                        Meta: {
                            match: (specifier) => specifier[1].type === 'meta',
                            plan: ($specifier) => meta.get({ id: access($specifier.at(1), ['id']) }),
                        },
                    };

                    // TODO: Needs a connection($list)
                    return each($contents, ($content) => {
                        const $specifier = list([
                            object({
                                id: access($content, ['c_id']),
                                type: access($content, ['c_type']),
                            }),
                            object({ id: access($content, ['m_id']), type: constant('meta') }),
                        ]);
                        return pgPolymorphic($content, $specifier, entityTypeMap);
                    });;
                }
            }
        },
    };
});
