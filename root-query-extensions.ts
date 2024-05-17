import { gql, makeExtendSchemaPlugin } from 'postgraphile/utils';

export const RootQueryExtensionsPlugin: GraphileConfig.Plugin = makeExtendSchemaPlugin((build) => {
    const {
        sql,
        input: { pgRegistry },
        grafast: { object, constant, each, connection },
    } = build;
    const { ICollection, meta, catalog } =
        pgRegistry.pgResources;
    return {
        typeDefs: gql`
        extend type Query {
          collections: ICollectionsConnection
          collectionById(id: String!): ICollection
        }
      `,
        plans: {
            Query: {
                collections($parent, fieldArgs) {
                    const $videos = ICollection.find();

                    return connection($videos);
                },
            },
        },
    };
});
